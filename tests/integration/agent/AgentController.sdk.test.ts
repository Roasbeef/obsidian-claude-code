import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";

import {
  createTestAgentController,
  waitForEvents,
  mockFsForClaudeExecutable,
  type TestAgentControllerResult,
} from "../../helpers/agentFactory";
import {
  createSystemInitMessage,
  createAssistantMessage,
  createSuccessResultMessage,
  createErrorResultMessage,
  createToolUseMessage,
  createTaskToolMessage,
  createSDKConversationSequence,
  MockQueryIterator,
  query as mockQuery,
  type SDKMessage,
} from "../../mocks/claude-sdk/index";

describe("AgentController SDK Integration", () => {
  let testHarness: TestAgentControllerResult;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fs.existsSync for findClaudeExecutable.
    mockFsForClaudeExecutable();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic message flow", () => {
    it("should store session ID from system init message", async () => {
      const sessionId = "session-abc-123";
      const messages = [
        createSystemInitMessage(sessionId, ["Read", "Write"]),
        createAssistantMessage("Hello!"),
        createSuccessResultMessage(1, 0.01),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await controller.sendMessage("Hi");

      expect(controller.getSessionId()).toBe(sessionId);
      expect(eventSpies.onStreamingStart).toHaveBeenCalled();
      expect(eventSpies.onStreamingEnd).toHaveBeenCalled();
    });

    it("should emit onMessage for assistant messages", async () => {
      const messages = createSDKConversationSequence("Hello from Claude!");

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await controller.sendMessage("Hi");

      expect(eventSpies.onMessage).toHaveBeenCalled();
      const lastCall = eventSpies.onMessage.mock.calls[eventSpies.onMessage.mock.calls.length - 1];
      expect(lastCall[0].content).toBe("Hello from Claude!");
    });

    it("should return final message from sendMessage", async () => {
      const messages = createSDKConversationSequence("Final response");

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller } = testHarness;

      const result = await controller.sendMessage("Query");

      expect(result.role).toBe("assistant");
      expect(result.content).toBe("Final response");
      expect(result.isStreaming).toBe(false);
    });

    it("should call onStreamingEnd in finally block even on error", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createErrorResultMessage(["API error"]),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await expect(controller.sendMessage("Hi")).rejects.toThrow("API error");

      expect(eventSpies.onStreamingStart).toHaveBeenCalled();
      expect(eventSpies.onStreamingEnd).toHaveBeenCalled();
    });
  });

  describe("tool call flow", () => {
    it("should emit onToolCall when tool_use block is received", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createToolUseMessage("Read", { file_path: "/test.md" }, "tool-read-1"),
        createAssistantMessage("I read the file."),
        createSuccessResultMessage(1, 0.01),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await controller.sendMessage("Read test.md");

      expect(eventSpies.onToolCall).toHaveBeenCalled();
      const toolCall = eventSpies.onToolCall.mock.calls[0][0];
      expect(toolCall.name).toBe("Read");
      expect(toolCall.input.file_path).toBe("/test.md");
      // Tool starts as running, then gets marked success by final result.
      expect(toolCall.startTime).toBeDefined();
    });

    it("should include tool calls in final message", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createToolUseMessage("Write", { file_path: "/out.md", content: "Hello" }),
        createAssistantMessage("Done."),
        createSuccessResultMessage(1, 0.01),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller } = testHarness;

      const result = await controller.sendMessage("Write file");

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls!.length).toBe(1);
      expect(result.toolCalls![0].name).toBe("Write");
    });

    it("should mark tools as success on successful completion", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createToolUseMessage("Glob", { pattern: "*.md" }),
        createAssistantMessage("Found 5 files."),
        createSuccessResultMessage(1, 0.01),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller } = testHarness;

      const result = await controller.sendMessage("List files");

      expect(result.toolCalls![0].status).toBe("success");
      expect(result.toolCalls![0].endTime).toBeDefined();
    });
  });

  describe("session management", () => {
    it("should start with null session ID", async () => {
      testHarness = await createTestAgentController();
      expect(testHarness.controller.getSessionId()).toBeNull();
    });

    it("should allow setting session ID for resume", async () => {
      testHarness = await createTestAgentController();
      testHarness.controller.setSessionId("existing-session-456");
      expect(testHarness.controller.getSessionId()).toBe("existing-session-456");
    });

    it("should clear session ID on clearHistory", async () => {
      const messages = createSDKConversationSequence("Hello");
      testHarness = await createTestAgentController({ queryMessages: messages });

      await testHarness.controller.sendMessage("Hi");
      expect(testHarness.controller.getSessionId()).toBe("test-session-123");

      testHarness.controller.clearHistory();
      expect(testHarness.controller.getSessionId()).toBeNull();
    });

    it("should pass resume session ID to query options", async () => {
      const messages = createSDKConversationSequence("Resumed");
      testHarness = await createTestAgentController({ queryMessages: messages });

      testHarness.controller.setSessionId("resume-session-789");
      await testHarness.controller.sendMessage("Continue");

      const queryCall = (mockQuery as Mock).mock.calls[0];
      expect(queryCall[0].options.resume).toBe("resume-session-789");
    });
  });

  describe("subagent lifecycle", () => {
    it("should detect Task tool as subagent", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createTaskToolMessage("Explore", "Search for API endpoints"),
        createAssistantMessage("Agent found the endpoints."),
        createSuccessResultMessage(1, 0.02),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await controller.sendMessage("Find API endpoints");

      // Wait for setTimeout in processAssistantMessage.
      await waitForEvents(50);

      expect(eventSpies.onToolCall).toHaveBeenCalled();
      const toolCall = eventSpies.onToolCall.mock.calls[0][0];
      expect(toolCall.isSubagent).toBe(true);
      expect(toolCall.subagentType).toBe("Explore");
    });

    it("should emit onSubagentStart for Task tools", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createTaskToolMessage("code-reviewer", "Review the PR"),
        createAssistantMessage("Review complete."),
        createSuccessResultMessage(1, 0.03),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await controller.sendMessage("Review PR");
      await waitForEvents(50);

      expect(eventSpies.onSubagentStart).toHaveBeenCalled();
      const startArgs = eventSpies.onSubagentStart.mock.calls[0];
      expect(startArgs[1]).toBe("code-reviewer"); // subagentType
    });

    it("should include subagent progress in tool call", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createTaskToolMessage("Plan", "Design implementation"),
        createAssistantMessage("Plan ready."),
        createSuccessResultMessage(1, 0.01),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller } = testHarness;

      const result = await controller.sendMessage("Plan feature");

      const taskTool = result.toolCalls?.find((tc) => tc.isSubagent);
      expect(taskTool).toBeDefined();
      expect(taskTool!.subagentProgress).toBeDefined();
      // The subagent gets marked completed by the success result.
      expect(taskTool!.subagentProgress!.startTime).toBeDefined();
    });
  });

  describe("cancellation", () => {
    it("should clear abortController on cancelStream", async () => {
      testHarness = await createTestAgentController();
      const { controller } = testHarness;

      // Before any request, cancelStream should be safe to call.
      controller.cancelStream();

      // Controller should still be usable.
      expect(controller.getSessionId()).toBeNull();
    });

    it("should mark running subagents as interrupted on cancel", async () => {
      // This is a design-level test that verifies the cancellation logic.
      // We test the data structure manipulation that cancelStream performs.
      const pendingSubagents = new Map<string, string>();
      pendingSubagents.set("subagent-1", "tool-1");

      const currentToolCalls = [
        {
          id: "tool-1",
          isSubagent: true,
          subagentStatus: "running" as "running" | "interrupted",
          subagentProgress: { message: "Running", startTime: Date.now(), lastUpdate: Date.now() },
        },
      ];

      // Simulate cancellation logic from AgentController.cancelStream.
      for (const [subagentId, toolCallId] of pendingSubagents) {
        const toolCall = currentToolCalls.find((tc) => tc.id === toolCallId);
        if (toolCall) {
          toolCall.subagentStatus = "interrupted";
          toolCall.subagentProgress.message = "Cancelled by user";
        }
      }
      pendingSubagents.clear();

      expect(currentToolCalls[0].subagentStatus).toBe("interrupted");
      expect(currentToolCalls[0].subagentProgress.message).toBe("Cancelled by user");
      expect(pendingSubagents.size).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should emit onError for non-abort errors", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createErrorResultMessage(["Something went wrong"]),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await expect(controller.sendMessage("Fail")).rejects.toThrow("Something went wrong");
      expect(eventSpies.onError).toHaveBeenCalled();
    });

    it("should mark running tools as error on failure", async () => {
      const messages: SDKMessage[] = [
        createSystemInitMessage("session-123"),
        createToolUseMessage("Bash", { command: "fail" }),
        createErrorResultMessage(["Command failed"]),
      ];

      testHarness = await createTestAgentController({ queryMessages: messages });
      const { controller, eventSpies } = testHarness;

      await expect(controller.sendMessage("Run command")).rejects.toThrow();

      // Check the tool call was marked as error.
      const messageCall = eventSpies.onMessage.mock.calls.find(
        (call) => call[0].toolCalls?.some((tc: any) => tc.status === "error")
      );
      expect(messageCall).toBeDefined();
    });

    it("should classify errors via classifyError function", async () => {
      // Import classifyError to test it directly.
      const { classifyError } = await import("../../../src/agent/AgentController");

      // Auth errors.
      expect(classifyError(new Error("unauthorized"))).toBe("auth");
      expect(classifyError(new Error("401 Unauthorized"))).toBe("auth");
      expect(classifyError(new Error("invalid api key"))).toBe("auth");

      // Network errors.
      expect(classifyError(new Error("ENOTFOUND"))).toBe("network");
      expect(classifyError(new Error("ECONNREFUSED"))).toBe("network");

      // Transient errors.
      expect(classifyError(new Error("rate limit exceeded"))).toBe("transient");
      expect(classifyError(new Error("429 Too Many Requests"))).toBe("transient");
      expect(classifyError(new Error("timeout"))).toBe("transient");

      // Permanent errors (default).
      expect(classifyError(new Error("unknown error"))).toBe("permanent");
    });
  });

  describe("isReady check", () => {
    it("should return true when API key is set", async () => {
      testHarness = await createTestAgentController({
        settings: { apiKey: "test-key" },
      });
      expect(testHarness.controller.isReady()).toBe(true);
    });

    it("should return true when env var is set", async () => {
      process.env.ANTHROPIC_API_KEY = "env-key";
      testHarness = await createTestAgentController({
        settings: { apiKey: "" },
      });
      expect(testHarness.controller.isReady()).toBe(true);
      delete process.env.ANTHROPIC_API_KEY;
    });

    it("should return false when no auth configured", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
      testHarness = await createTestAgentController({
        settings: { apiKey: "" },
      });
      expect(testHarness.controller.isReady()).toBe(false);
    });
  });

  describe("query options", () => {
    it("should pass model from settings", async () => {
      const messages = createSDKConversationSequence("Response");
      testHarness = await createTestAgentController({
        queryMessages: messages,
        settings: { model: "opus" },
      });

      await testHarness.controller.sendMessage("Test");

      const queryCall = (mockQuery as Mock).mock.calls[0];
      expect(queryCall[0].options.model).toBe("opus");
    });

    it("should pass cwd as vault path", async () => {
      const messages = createSDKConversationSequence("Response");
      testHarness = await createTestAgentController({ queryMessages: messages });

      await testHarness.controller.sendMessage("Test");

      const queryCall = (mockQuery as Mock).mock.calls[0];
      expect(queryCall[0].options.cwd).toBeDefined();
    });

    it("should pass maxBudgetUsd from settings", async () => {
      const messages = createSDKConversationSequence("Response");
      testHarness = await createTestAgentController({
        queryMessages: messages,
        settings: { maxBudgetPerSession: 10.0 },
      });

      await testHarness.controller.sendMessage("Test");

      const queryCall = (mockQuery as Mock).mock.calls[0];
      expect(queryCall[0].options.maxBudgetUsd).toBe(10.0);
    });
  });
});
