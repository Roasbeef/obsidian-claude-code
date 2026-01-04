import { vi } from "vitest";

export { createMockQuery, MockQueryIterator } from "./query.mock";
export {
  createInitMessage,
  createSystemInitMessage,
  createAssistantMessage,
  createResultMessage,
  createSuccessResultMessage,
  createErrorResultMessage,
  createToolUseMessage,
  createToolResultMessage,
  createTaskToolMessage,
  createConversationSequence,
  createSDKConversationSequence,
} from "./SDKMessage.mock";

// Mock the query function from the SDK.
export const query = vi.fn();

// Mock createSdkMcpServer.
export const createSdkMcpServer = vi.fn().mockReturnValue({
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
});

// Mock tool function for MCP servers.
export const tool = vi.fn().mockImplementation((schema, handler) => ({
  schema,
  handler,
}));

// Re-export types that might be needed.
export type SDKMessage = {
  type: string;
  subtype?: string;
  session_id?: string;
  tools?: string[];
  num_turns?: number;
  total_cost_usd?: number;
  errors?: string[];
  message?: {
    role: string;
    content: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: any;
      tool_use_id?: string;
      content?: string;
      is_error?: boolean;
    }>;
  };
  result?: string | {
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  event?: {
    type: string;
    delta?: { type: string; text?: string };
  };
};
