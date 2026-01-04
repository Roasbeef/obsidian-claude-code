import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import the actual ConversationManager class.
import { ConversationManager } from "../../../src/agent/ConversationManager";
import { createMockPlugin } from "../../helpers/factories";
import * as formatting from "../../../src/utils/formatting";

describe("ConversationManager (real)", () => {
  let manager: ConversationManager;
  let mockPlugin: ReturnType<typeof createMockPlugin>;

  beforeEach(() => {
    mockPlugin = createMockPlugin();

    // Setup vault mock with in-memory storage.
    const files = new Map<string, string>();
    mockPlugin.app.vault.adapter.exists.mockImplementation(async (path: string) => {
      return files.has(path);
    });
    mockPlugin.app.vault.adapter.read.mockImplementation(async (path: string) => {
      return files.get(path) || "";
    });
    mockPlugin.app.vault.adapter.write.mockImplementation(async (path: string, content: string) => {
      files.set(path, content);
    });
    mockPlugin.app.vault.getAbstractFileByPath.mockReturnValue(null);
    mockPlugin.app.vault.createFolder.mockResolvedValue(undefined);

    // Mock generateTitleWithHaiku to return null (fall back to simple title generation).
    vi.spyOn(formatting, "generateTitleWithHaiku").mockResolvedValue(null);

    // Create actual ConversationManager instance.
    manager = new ConversationManager(mockPlugin as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create storage directories on initialize", async () => {
      await manager.initialize();

      expect(mockPlugin.app.vault.createFolder).toHaveBeenCalled();
    });

    it("should be idempotent - multiple initializations are safe", async () => {
      await manager.initialize();
      await manager.initialize();
      await manager.initialize();

      // Should not error.
      expect(true).toBe(true);
    });
  });

  describe("createConversation", () => {
    it("should create a new conversation with unique ID", async () => {
      const conv = await manager.createConversation();

      expect(conv.id).toMatch(/^conv-\d+-/);
      expect(conv.title).toBeDefined();
      expect(conv.createdAt).toBeDefined();
      expect(conv.updatedAt).toBeDefined();
    });

    it("should create conversation with custom title", async () => {
      const conv = await manager.createConversation("My Custom Title");

      expect(conv.title).toBe("My Custom Title");
    });

    it("should save conversation to file", async () => {
      await manager.createConversation();

      expect(mockPlugin.app.vault.adapter.write).toHaveBeenCalled();
    });

    it("should set conversation as active", async () => {
      const conv = await manager.createConversation();
      const current = manager.getCurrentConversation();

      expect(current?.id).toBe(conv.id);
    });
  });

  describe("addMessage", () => {
    it("should add message to conversation", async () => {
      await manager.createConversation();

      await manager.addMessage({
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      });

      const messages = manager.getDisplayMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Hello");
    });

    it("should auto-generate title after first assistant response", async () => {
      await manager.createConversation();

      // Add user message
      await manager.addMessage({
        id: "msg-1",
        role: "user",
        content: "What is the capital of France?",
        timestamp: Date.now(),
      });

      // Title should still be default
      let conv = manager.getCurrentConversation();
      expect(conv?.title).toBe("Conversation 1");

      // Add assistant response - this triggers title generation
      await manager.addMessage({
        id: "msg-2",
        role: "assistant",
        content: "The capital of France is Paris.",
        timestamp: Date.now(),
      });

      // Now title should be generated (falling back to simple method since Haiku is mocked to return null)
      conv = manager.getCurrentConversation();
      expect(conv?.title).toBe("What is the capital of France?");
    });

    it("should truncate long titles to 50 characters", async () => {
      await manager.createConversation();

      // Add user message
      await manager.addMessage({
        id: "msg-1",
        role: "user",
        content: "This is a very long message that should be truncated because it exceeds fifty characters",
        timestamp: Date.now(),
      });

      // Add assistant response to trigger title generation
      await manager.addMessage({
        id: "msg-2",
        role: "assistant",
        content: "I understand.",
        timestamp: Date.now(),
      });

      const conv = manager.getCurrentConversation();
      expect(conv?.title.length).toBe(50);
      expect(conv?.title.endsWith("...")).toBe(true);
    });

    it("should create conversation if none exists", async () => {
      // Don't call createConversation first.
      await manager.addMessage({
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      });

      expect(manager.getCurrentConversation()).toBeTruthy();
    });

    it("should increment message count", async () => {
      await manager.createConversation();

      await manager.addMessage({
        id: "msg-1",
        role: "user",
        content: "First",
        timestamp: Date.now(),
      });

      await manager.addMessage({
        id: "msg-2",
        role: "assistant",
        content: "Second",
        timestamp: Date.now(),
      });

      const conv = manager.getCurrentConversation();
      expect(conv?.messageCount).toBe(2);
    });

    it("should store history entry when provided", async () => {
      await manager.createConversation();

      await manager.addMessage(
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: Date.now(),
        },
        { role: "user", content: "Hello" }
      );

      const history = manager.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].content).toBe("Hello");
    });
  });

  describe("loadConversation", () => {
    it("should load conversation by ID", async () => {
      const created = await manager.createConversation("Test Conversation");

      // Clear current and reload.
      manager.clearCurrent();
      const loaded = await manager.loadConversation(created.id);

      expect(loaded?.id).toBe(created.id);
      expect(loaded?.title).toBe("Test Conversation");
    });

    it("should return null for non-existent conversation", async () => {
      await manager.initialize();
      const loaded = await manager.loadConversation("non-existent-id");

      expect(loaded).toBeNull();
    });

    it("should set loaded conversation as current", async () => {
      const created = await manager.createConversation();
      manager.clearCurrent();

      await manager.loadConversation(created.id);

      expect(manager.getCurrentConversation()?.id).toBe(created.id);
    });
  });

  describe("getConversations", () => {
    it("should return all conversations", async () => {
      await manager.createConversation("First");
      await manager.createConversation("Second");

      const all = await manager.getConversations();

      expect(all.length).toBe(2);
    });

    it("should return conversations ordered by most recent", async () => {
      await manager.createConversation("First");
      await new Promise((r) => setTimeout(r, 10));
      await manager.createConversation("Second");

      const all = await manager.getConversations();

      // Most recent first.
      expect(all[0].title).toBe("Second");
    });
  });

  describe("deleteConversation", () => {
    it("should remove conversation from index", async () => {
      const conv = await manager.createConversation();
      await manager.deleteConversation(conv.id);

      const all = await manager.getConversations();
      expect(all.find((c) => c.id === conv.id)).toBeUndefined();
    });

    it("should clear current if deleted conversation was current", async () => {
      const conv = await manager.createConversation();
      await manager.deleteConversation(conv.id);

      expect(manager.getCurrentConversation()).toBeNull();
    });
  });

  describe("updateUsage", () => {
    it("should accumulate token usage", async () => {
      await manager.createConversation();

      await manager.updateUsage(100, 0.01);
      await manager.updateUsage(50, 0.005);

      const conv = manager.getCurrentConversation();
      expect(conv?.metadata.totalTokens).toBe(150);
      expect(conv?.metadata.totalCostUsd).toBeCloseTo(0.015);
    });
  });

  describe("updateSessionId", () => {
    it("should update session ID for current conversation", async () => {
      await manager.createConversation();

      await manager.updateSessionId("new-session-123");

      const conv = manager.getCurrentConversation();
      expect(conv?.sessionId).toBe("new-session-123");
    });
  });

  describe("setHistory", () => {
    it("should replace conversation history", async () => {
      await manager.createConversation();

      await manager.setHistory([
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ]);

      const history = manager.getHistory();
      expect(history.length).toBe(2);
    });
  });

  describe("clearCurrent", () => {
    it("should clear current conversation", async () => {
      await manager.createConversation();
      manager.clearCurrent();

      expect(manager.getCurrentConversation()).toBeNull();
    });

    it("should clear display messages", async () => {
      await manager.createConversation();
      await manager.addMessage({
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      });

      manager.clearCurrent();

      expect(manager.getDisplayMessages()).toEqual([]);
    });
  });

  describe("updateSessionIdForConversation", () => {
    it("should update session ID for current conversation", async () => {
      const conv = await manager.createConversation();

      await manager.updateSessionIdForConversation(conv.id, "session-abc");

      const current = manager.getCurrentConversation();
      expect(current?.sessionId).toBe("session-abc");
    });

    it("should update session ID for non-current conversation", async () => {
      // Create first conversation.
      const first = await manager.createConversation("First");

      // Create second conversation (makes it current).
      await manager.createConversation("Second");

      // Update first conversation's session ID (not current).
      await manager.updateSessionIdForConversation(first.id, "session-xyz");

      // Load first conversation and verify session ID.
      await manager.loadConversation(first.id);
      const loaded = manager.getCurrentConversation();
      expect(loaded?.sessionId).toBe("session-xyz");
    });

    it("should handle non-existent conversation gracefully", async () => {
      await manager.initialize();

      // Should not throw - verify by checking the promise resolves.
      await expect(
        manager.updateSessionIdForConversation("non-existent", "session-abc")
      ).resolves.toBeUndefined();
    });
  });

  describe("addMessageToConversation", () => {
    it("should add message to current conversation", async () => {
      const conv = await manager.createConversation();

      await manager.addMessageToConversation(conv.id, {
        id: "msg-1",
        role: "assistant",
        content: "Response",
        timestamp: Date.now(),
      });

      const messages = manager.getDisplayMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].content).toBe("Response");
    });

    it("should add message to non-current conversation", async () => {
      // Create first conversation and add initial message.
      const first = await manager.createConversation("First");
      await manager.addMessage({
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: Date.now(),
      });

      // Create second conversation (makes it current).
      await manager.createConversation("Second");

      // Add message to first conversation (not current).
      await manager.addMessageToConversation(first.id, {
        id: "msg-2",
        role: "assistant",
        content: "Response to first",
        timestamp: Date.now(),
      });

      // Load first conversation and verify.
      await manager.loadConversation(first.id);
      const messages = manager.getDisplayMessages();
      expect(messages.some((m) => m.content === "Response to first")).toBe(true);
    });
  });
});
