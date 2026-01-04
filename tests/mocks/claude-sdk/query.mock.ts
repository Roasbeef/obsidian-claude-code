import { vi } from "vitest";

import type { SDKMessage } from "./index";

// Mock async iterator for query results.
export class MockQueryIterator implements AsyncIterable<SDKMessage> {
  private messages: SDKMessage[];
  private index = 0;

  constructor(messages: SDKMessage[]) {
    this.messages = messages;
  }

  [Symbol.asyncIterator](): AsyncIterator<SDKMessage> {
    return {
      next: async (): Promise<IteratorResult<SDKMessage>> => {
        if (this.index < this.messages.length) {
          return { value: this.messages[this.index++], done: false };
        }
        return { value: undefined as any, done: true };
      },
    };
  }

  // Test helper to add more messages during iteration.
  addMessage(message: SDKMessage): void {
    this.messages.push(message);
  }

  // Reset iterator for re-use.
  reset(): void {
    this.index = 0;
  }
}

// Create a mock query function that returns an async iterable.
export function createMockQuery(messages: SDKMessage[]): ReturnType<typeof vi.fn> {
  return vi.fn().mockReturnValue(new MockQueryIterator(messages));
}

// Create a simple mock query for basic tests.
export function createSimpleQuery(response: string): ReturnType<typeof vi.fn> {
  const messages: SDKMessage[] = [
    {
      type: "init",
      session_id: "test-session-123",
    },
    {
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "text", text: response }],
      },
    },
    {
      type: "result",
      result: {
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      },
    },
  ];
  return createMockQuery(messages);
}

// Create a mock query with tool calls.
export function createQueryWithToolCalls(
  toolCalls: Array<{ name: string; input: any; result: string }>
): ReturnType<typeof vi.fn> {
  const messages: SDKMessage[] = [
    {
      type: "init",
      session_id: "test-session-123",
    },
  ];

  // Add tool use and result messages for each tool call.
  for (const tool of toolCalls) {
    messages.push({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: `tool-${Math.random().toString(36).substring(7)}`,
            name: tool.name,
            input: tool.input,
          },
        ],
      },
    });
    messages.push({
      type: "assistant",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: messages[messages.length - 1].message!.content[0].id!,
            content: tool.result,
          },
        ],
      },
    });
  }

  // Add final result.
  messages.push({
    type: "result",
    result: {
      usage: {
        input_tokens: 200,
        output_tokens: 100,
      },
    },
  });

  return createMockQuery(messages);
}
