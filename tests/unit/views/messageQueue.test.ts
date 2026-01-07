import { describe, it, expect, vi, beforeEach } from "vitest";

import { QueuedMessage } from "../../../src/types";
import { createMockQueuedMessage } from "../../helpers/factories";

describe("MessageQueue", () => {
  let messageQueue: QueuedMessage[];
  let isStreaming: boolean;

  beforeEach(() => {
    messageQueue = [];
    isStreaming = false;
  });

  // Helper to generate unique IDs.
  function generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // Helper to add message to queue.
  function queueMessage(content: string): QueuedMessage {
    const queuedMessage: QueuedMessage = {
      id: generateId(),
      content,
      timestamp: Date.now(),
    };
    messageQueue.push(queuedMessage);
    return queuedMessage;
  }

  // Helper to remove message from queue.
  function removeQueuedMessage(id: string): boolean {
    const index = messageQueue.findIndex((m) => m.id === id);
    if (index !== -1) {
      messageQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  // Helper to get next message from queue.
  function dequeueMessage(): QueuedMessage | undefined {
    return messageQueue.shift();
  }

  describe("message queueing", () => {
    it("should add message to queue", () => {
      const msg = queueMessage("Test message");

      expect(messageQueue.length).toBe(1);
      expect(messageQueue[0].content).toBe("Test message");
      expect(messageQueue[0].id).toBe(msg.id);
    });

    it("should preserve message order (FIFO)", () => {
      queueMessage("First message");
      queueMessage("Second message");
      queueMessage("Third message");

      expect(messageQueue.length).toBe(3);
      expect(messageQueue[0].content).toBe("First message");
      expect(messageQueue[1].content).toBe("Second message");
      expect(messageQueue[2].content).toBe("Third message");
    });

    it("should generate unique IDs for each message", () => {
      const msg1 = queueMessage("Message 1");
      const msg2 = queueMessage("Message 2");

      expect(msg1.id).not.toBe(msg2.id);
    });

    it("should include timestamp in queued message", () => {
      const before = Date.now();
      const msg = queueMessage("Test");
      const after = Date.now();

      expect(msg.timestamp).toBeGreaterThanOrEqual(before);
      expect(msg.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("message removal", () => {
    it("should remove message by ID", () => {
      const msg1 = queueMessage("First");
      const msg2 = queueMessage("Second");
      queueMessage("Third");

      const removed = removeQueuedMessage(msg2.id);

      expect(removed).toBe(true);
      expect(messageQueue.length).toBe(2);
      expect(messageQueue.find((m) => m.id === msg2.id)).toBeUndefined();
    });

    it("should return false when removing non-existent message", () => {
      queueMessage("First");

      const removed = removeQueuedMessage("non-existent-id");

      expect(removed).toBe(false);
      expect(messageQueue.length).toBe(1);
    });

    it("should preserve order when removing from middle", () => {
      queueMessage("First");
      const msg2 = queueMessage("Second");
      queueMessage("Third");

      removeQueuedMessage(msg2.id);

      expect(messageQueue[0].content).toBe("First");
      expect(messageQueue[1].content).toBe("Third");
    });
  });

  describe("message dequeuing", () => {
    it("should dequeue first message", () => {
      queueMessage("First");
      queueMessage("Second");

      const dequeued = dequeueMessage();

      expect(dequeued?.content).toBe("First");
      expect(messageQueue.length).toBe(1);
      expect(messageQueue[0].content).toBe("Second");
    });

    it("should return undefined when queue is empty", () => {
      const dequeued = dequeueMessage();

      expect(dequeued).toBeUndefined();
    });

    it("should process messages in order", () => {
      queueMessage("First");
      queueMessage("Second");
      queueMessage("Third");

      const results: string[] = [];
      while (messageQueue.length > 0) {
        const msg = dequeueMessage();
        if (msg) results.push(msg.content);
      }

      expect(results).toEqual(["First", "Second", "Third"]);
    });
  });

  describe("streaming state interaction", () => {
    it("should queue messages when streaming", () => {
      isStreaming = true;

      if (isStreaming) {
        queueMessage("Message while streaming");
      }

      expect(messageQueue.length).toBe(1);
    });

    it("should allow multiple queued messages during streaming", () => {
      isStreaming = true;

      queueMessage("First queued");
      queueMessage("Second queued");
      queueMessage("Third queued");

      expect(messageQueue.length).toBe(3);
    });

    it("should process queue after streaming ends", () => {
      // Simulate streaming and queueing.
      isStreaming = true;
      queueMessage("Queued message 1");
      queueMessage("Queued message 2");

      // Simulate streaming end.
      isStreaming = false;

      // Process queue.
      const processed: string[] = [];
      while (messageQueue.length > 0 && !isStreaming) {
        const msg = dequeueMessage();
        if (msg) {
          processed.push(msg.content);
          // In real code, this would trigger isStreaming = true again.
        }
      }

      expect(processed).toEqual(["Queued message 1", "Queued message 2"]);
      expect(messageQueue.length).toBe(0);
    });
  });

  describe("queue length helpers", () => {
    it("should report correct queue length", () => {
      expect(messageQueue.length).toBe(0);

      queueMessage("First");
      expect(messageQueue.length).toBe(1);

      queueMessage("Second");
      expect(messageQueue.length).toBe(2);

      dequeueMessage();
      expect(messageQueue.length).toBe(1);
    });

    it("should correctly determine if queue is empty", () => {
      expect(messageQueue.length === 0).toBe(true);

      queueMessage("Test");
      expect(messageQueue.length === 0).toBe(false);

      dequeueMessage();
      expect(messageQueue.length === 0).toBe(true);
    });
  });

  describe("factory helpers", () => {
    it("should create mock queued message with defaults", () => {
      const msg = createMockQueuedMessage();

      expect(msg.id).toBeDefined();
      expect(msg.content).toBe("Queued test message");
      expect(msg.timestamp).toBeDefined();
    });

    it("should create mock queued message with overrides", () => {
      const msg = createMockQueuedMessage({
        content: "Custom content",
        timestamp: 12345,
      });

      expect(msg.content).toBe("Custom content");
      expect(msg.timestamp).toBe(12345);
    });
  });

  describe("edge cases", () => {
    it("should handle empty content messages", () => {
      const msg = queueMessage("");

      expect(messageQueue.length).toBe(1);
      expect(msg.content).toBe("");
    });

    it("should handle very long messages", () => {
      const longContent = "a".repeat(10000);
      const msg = queueMessage(longContent);

      expect(msg.content.length).toBe(10000);
      expect(messageQueue[0].content).toBe(longContent);
    });

    it("should handle special characters in content", () => {
      const specialContent = "Test\n\t@[[file.md]] /command `code` **bold**";
      const msg = queueMessage(specialContent);

      expect(msg.content).toBe(specialContent);
    });

    it("should handle rapid queueing", () => {
      for (let i = 0; i < 100; i++) {
        queueMessage(`Message ${i}`);
      }

      expect(messageQueue.length).toBe(100);
      expect(messageQueue[0].content).toBe("Message 0");
      expect(messageQueue[99].content).toBe("Message 99");
    });
  });
});
