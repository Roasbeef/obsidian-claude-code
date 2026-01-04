import { vi, type Mock } from "vitest";

import { createMockPlugin, type MockPlugin, type MockPluginSettings } from "./factories";
import {
  MockQueryIterator,
  type SDKMessage,
  query as mockQuery,
} from "../mocks/claude-sdk/index";

// Options for creating a test AgentController.
export interface TestAgentControllerOptions {
  // Plugin settings overrides.
  settings?: Partial<MockPluginSettings>;

  // Pre-configured query messages.
  queryMessages?: SDKMessage[];

  // Event handler spies.
  eventSpies?: {
    onMessage?: Mock;
    onToolCall?: Mock;
    onToolResult?: Mock;
    onStreamingStart?: Mock;
    onStreamingEnd?: Mock;
    onError?: Mock;
    onSubagentStart?: Mock;
    onSubagentStop?: Mock;
  };
}

// Result from createTestAgentController.
export interface TestAgentControllerResult {
  controller: any; // AgentController instance
  mockPlugin: MockPlugin;
  queryMock: typeof mockQuery;
  eventSpies: NonNullable<TestAgentControllerOptions["eventSpies"]>;

  // Helper to set query messages for the next sendMessage call.
  setQueryMessages: (messages: SDKMessage[]) => void;

  // Helper to get the canUseTool callback from last query call.
  getCanUseToolCallback: () => ((toolName: string, input: any) => Promise<any>) | undefined;
}

// Create a testable AgentController instance.
export async function createTestAgentController(
  options?: TestAgentControllerOptions
): Promise<TestAgentControllerResult> {
  // Create mock plugin with settings.
  // Only pass settings if provided (avoid passing { settings: undefined }).
  const pluginOverrides = options?.settings ? { settings: options.settings } : {};
  const mockPlugin = createMockPlugin(pluginOverrides);

  // Create event spies.
  const eventSpies = {
    onMessage: options?.eventSpies?.onMessage ?? vi.fn(),
    onToolCall: options?.eventSpies?.onToolCall ?? vi.fn(),
    onToolResult: options?.eventSpies?.onToolResult ?? vi.fn(),
    onStreamingStart: options?.eventSpies?.onStreamingStart ?? vi.fn(),
    onStreamingEnd: options?.eventSpies?.onStreamingEnd ?? vi.fn(),
    onError: options?.eventSpies?.onError ?? vi.fn(),
    onSubagentStart: options?.eventSpies?.onSubagentStart ?? vi.fn(),
    onSubagentStop: options?.eventSpies?.onSubagentStop ?? vi.fn(),
  };

  // Setup initial query messages if provided.
  let currentMessages = options?.queryMessages ?? [];
  (mockQuery as Mock).mockImplementation(() => new MockQueryIterator(currentMessages));

  // Import AgentController after mocks are set up.
  const { AgentController } = await import("../../src/agent/AgentController");

  // Create controller instance.
  const controller = new AgentController(mockPlugin as any);

  // Set event handlers.
  controller.setEventHandlers(eventSpies);

  return {
    controller,
    mockPlugin,
    queryMock: mockQuery,
    eventSpies,

    setQueryMessages: (messages: SDKMessage[]) => {
      currentMessages = messages;
      (mockQuery as Mock).mockImplementation(() => new MockQueryIterator(messages));
    },

    getCanUseToolCallback: () => {
      const lastCall = (mockQuery as Mock).mock.calls[(mockQuery as Mock).mock.calls.length - 1];
      if (lastCall) {
        const queryOptions = lastCall[0]?.options;
        return queryOptions?.canUseTool;
      }
      return undefined;
    },
  };
}

// Helper to wait for async events to complete.
export function waitForEvents(ms = 10): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// No-op function kept for backward compatibility.
// The Claude CLI should be installed in the test environment.
export function mockFsForClaudeExecutable(): void {
  // No-op - relies on real CLI being installed
}
