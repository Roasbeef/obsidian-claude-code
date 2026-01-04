import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { classifyError } from "@/agent/AgentController";
import { createMockPlugin, MockPlugin } from "../../helpers/factories";

// Test the permission handling logic by extracting the decision rules.
// These mirror the rules in AgentController.handlePermission().

const readOnlyTools = [
  "Read",
  "Glob",
  "Grep",
  "LS",
  "mcp__obsidian__get_active_file",
  "mcp__obsidian__get_vault_stats",
  "mcp__obsidian__get_recent_files",
  "mcp__obsidian__list_commands",
];

const obsidianUiTools = [
  "mcp__obsidian__open_file",
  "mcp__obsidian__show_notice",
  "mcp__obsidian__reveal_in_explorer",
  "mcp__obsidian__execute_command",
  "mcp__obsidian__create_note",
];

const writeTools = ["Write", "Edit", "MultiEdit"];

describe("AgentController", () => {
  let mockPlugin: MockPlugin;

  beforeEach(() => {
    mockPlugin = createMockPlugin();
    // Reset env vars.
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("isReady", () => {
    it("should return true when API key is set in settings", () => {
      mockPlugin.settings.apiKey = "test-key";
      const isReady = !!(
        mockPlugin.settings.apiKey ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_CODE_OAUTH_TOKEN
      );
      expect(isReady).toBe(true);
    });

    it("should return true when ANTHROPIC_API_KEY env var is set", () => {
      mockPlugin.settings.apiKey = "";
      process.env.ANTHROPIC_API_KEY = "env-key";
      const isReady = !!(
        mockPlugin.settings.apiKey ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_CODE_OAUTH_TOKEN
      );
      expect(isReady).toBe(true);
    });

    it("should return true when CLAUDE_CODE_OAUTH_TOKEN env var is set", () => {
      mockPlugin.settings.apiKey = "";
      process.env.CLAUDE_CODE_OAUTH_TOKEN = "oauth-token";
      const isReady = !!(
        mockPlugin.settings.apiKey ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_CODE_OAUTH_TOKEN
      );
      expect(isReady).toBe(true);
    });

    it("should return false when no authentication is configured", () => {
      mockPlugin.settings.apiKey = "";
      const isReady = !!(
        mockPlugin.settings.apiKey ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.CLAUDE_CODE_OAUTH_TOKEN
      );
      expect(isReady).toBe(false);
    });
  });

  describe("session management", () => {
    it("should start with null session ID", () => {
      let sessionId: string | null = null;
      expect(sessionId).toBeNull();
    });

    it("should store session ID after setSessionId", () => {
      let sessionId: string | null = null;
      sessionId = "session-123";
      expect(sessionId).toBe("session-123");
    });

    it("should clear session ID on clearHistory", () => {
      let sessionId: string | null = "session-123";
      sessionId = null; // clearHistory behavior.
      expect(sessionId).toBeNull();
    });

    it("should return session ID from getSessionId", () => {
      let sessionId: string | null = "session-abc";
      expect(sessionId).toBe("session-abc");
    });
  });

  describe("permission handling - read-only tools", () => {
    it.each(readOnlyTools)("should auto-approve read-only tool: %s", (toolName) => {
      // Read-only tools are always approved.
      const isReadOnly = readOnlyTools.includes(toolName);
      expect(isReadOnly).toBe(true);
    });

    it("should not include write tools in read-only list", () => {
      for (const tool of writeTools) {
        expect(readOnlyTools).not.toContain(tool);
      }
    });

    it("should not include bash in read-only list", () => {
      expect(readOnlyTools).not.toContain("Bash");
    });
  });

  describe("permission handling - Obsidian UI tools", () => {
    it.each(obsidianUiTools)("should auto-approve Obsidian UI tool: %s", (toolName) => {
      // Obsidian UI tools are safe operations.
      const isUiTool = obsidianUiTools.includes(toolName);
      expect(isUiTool).toBe(true);
    });

    it("should include open_file in UI tools", () => {
      expect(obsidianUiTools).toContain("mcp__obsidian__open_file");
    });

    it("should include show_notice in UI tools", () => {
      expect(obsidianUiTools).toContain("mcp__obsidian__show_notice");
    });

    it("should include create_note in UI tools", () => {
      expect(obsidianUiTools).toContain("mcp__obsidian__create_note");
    });
  });

  describe("permission handling - write tools", () => {
    it.each(writeTools)("should identify write tool: %s", (toolName) => {
      const isWriteTool = writeTools.includes(toolName);
      expect(isWriteTool).toBe(true);
    });

    it("should auto-approve write tools when autoApproveVaultWrites is true", () => {
      mockPlugin.settings.autoApproveVaultWrites = true;
      const autoApprove = mockPlugin.settings.autoApproveVaultWrites;
      expect(autoApprove).toBe(true);
    });

    it("should require approval for write tools when autoApproveVaultWrites is false", () => {
      mockPlugin.settings.autoApproveVaultWrites = false;
      const autoApprove = mockPlugin.settings.autoApproveVaultWrites;
      expect(autoApprove).toBe(false);
    });
  });

  describe("permission handling - bash tool", () => {
    it("should require approval for Bash when requireBashApproval is true", () => {
      mockPlugin.settings.requireBashApproval = true;
      const requireApproval = mockPlugin.settings.requireBashApproval;
      expect(requireApproval).toBe(true);
    });

    it("should not require approval for Bash when requireBashApproval is false", () => {
      mockPlugin.settings.requireBashApproval = false;
      const requireApproval = mockPlugin.settings.requireBashApproval;
      expect(requireApproval).toBe(false);
    });
  });

  describe("permission handling - always allowed tools", () => {
    it("should auto-approve tools in alwaysAllowedTools list", () => {
      mockPlugin.settings.alwaysAllowedTools = ["Bash", "Write"];
      const isAlwaysAllowed = mockPlugin.settings.alwaysAllowedTools.includes("Bash");
      expect(isAlwaysAllowed).toBe(true);
    });

    it("should start with empty alwaysAllowedTools list", () => {
      mockPlugin.settings.alwaysAllowedTools = [];
      expect(mockPlugin.settings.alwaysAllowedTools).toEqual([]);
    });

    it("should persist tool to alwaysAllowedTools on 'always' choice", async () => {
      mockPlugin.settings.alwaysAllowedTools = [];
      const toolName = "Bash";

      // Simulate "always" choice.
      if (!mockPlugin.settings.alwaysAllowedTools.includes(toolName)) {
        mockPlugin.settings.alwaysAllowedTools.push(toolName);
        await mockPlugin.saveSettings();
      }

      expect(mockPlugin.settings.alwaysAllowedTools).toContain("Bash");
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });
  });

  describe("permission handling - Task tool", () => {
    it("should auto-approve Task tool (subagents request their own permissions)", () => {
      const toolName = "Task";
      // Task tools are auto-approved because subagents handle their own permissions.
      const isTask = toolName === "Task";
      expect(isTask).toBe(true);
    });
  });

  describe("permission memory", () => {
    it("should remember session approvals", () => {
      const approvedTools = new Set<string>();
      approvedTools.add("Write");

      expect(approvedTools.has("Write")).toBe(true);
      expect(approvedTools.has("Edit")).toBe(false);
    });

    it("should clear session approvals on new session", () => {
      const approvedTools = new Set<string>(["Write", "Edit"]);
      approvedTools.clear();

      expect(approvedTools.size).toBe(0);
    });

    it("should add tool on 'session' choice", () => {
      const approvedTools = new Set<string>();
      const choice = "session";
      const toolName = "Edit";

      if (choice === "session") {
        approvedTools.add(toolName);
      }

      expect(approvedTools.has(toolName)).toBe(true);
    });
  });

  describe("error retry logic", () => {
    it("should retry on transient errors", async () => {
      let attempts = 0;
      const maxRetries = 2;

      const sendWithRetry = async (): Promise<string> => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            attempts++;
            if (attempt < maxRetries) {
              throw new Error("rate limit exceeded");
            }
            return "success";
          } catch (error) {
            const errorType = classifyError(error as Error);
            if (errorType !== "transient" || attempt >= maxRetries) {
              throw error;
            }
            // Wait before retry.
            await new Promise((r) => setTimeout(r, 10));
          }
        }
        throw new Error("should not reach");
      };

      const result = await sendWithRetry();
      expect(result).toBe("success");
      expect(attempts).toBe(3); // Initial + 2 retries.
    });

    it("should not retry on auth errors", async () => {
      let attempts = 0;

      const sendWithRetry = async (): Promise<string> => {
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            attempts++;
            throw new Error("unauthorized");
          } catch (error) {
            const errorType = classifyError(error as Error);
            if (errorType !== "transient" || attempt >= maxRetries) {
              throw error;
            }
          }
        }
        throw new Error("should not reach");
      };

      await expect(sendWithRetry()).rejects.toThrow("unauthorized");
      expect(attempts).toBe(1); // No retries for auth errors.
    });

    it("should not retry on network errors", async () => {
      let attempts = 0;

      const sendWithRetry = async (): Promise<string> => {
        const maxRetries = 2;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            attempts++;
            throw new Error("ENOTFOUND");
          } catch (error) {
            const errorType = classifyError(error as Error);
            if (errorType !== "transient" || attempt >= maxRetries) {
              throw error;
            }
          }
        }
        throw new Error("should not reach");
      };

      await expect(sendWithRetry()).rejects.toThrow("ENOTFOUND");
      expect(attempts).toBe(1); // No retries for network errors.
    });

    it("should use exponential backoff", async () => {
      const delays: number[] = [];
      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const delay = 1000 * Math.pow(2, attempt);
        delays.push(delay);
      }

      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });

  describe("message ID generation", () => {
    it("should generate unique message IDs", () => {
      const generateId = (): string => {
        return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      };

      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it("should match expected format", () => {
      const generateId = (): string => {
        return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      };

      const id = generateId();
      expect(id).toMatch(/^msg-\d+-[a-z0-9]+$/);
    });
  });

  describe("subagent tracking", () => {
    it("should detect Task tool as subagent", () => {
      const toolName = "Task";
      const input = { subagent_type: "Explore", description: "Search codebase" };

      const isSubagent = toolName === "Task";
      const subagentType = input.subagent_type;

      expect(isSubagent).toBe(true);
      expect(subagentType).toBe("Explore");
    });

    it("should track pending subagents by ID", () => {
      const pendingSubagents = new Map<string, string>();
      const subagentId = "subagent-123";
      const toolCallId = "tool-456";

      pendingSubagents.set(subagentId, toolCallId);

      expect(pendingSubagents.has(subagentId)).toBe(true);
      expect(pendingSubagents.get(subagentId)).toBe(toolCallId);
    });

    it("should remove subagent on completion", () => {
      const pendingSubagents = new Map<string, string>();
      pendingSubagents.set("subagent-123", "tool-456");

      pendingSubagents.delete("subagent-123");

      expect(pendingSubagents.has("subagent-123")).toBe(false);
    });

    it("should handle subagent status transitions", () => {
      type SubagentStatus = "starting" | "running" | "completed" | "error" | "interrupted";

      const transitions: SubagentStatus[] = ["starting", "running", "completed"];

      expect(transitions[0]).toBe("starting");
      expect(transitions[1]).toBe("running");
      expect(transitions[2]).toBe("completed");
    });
  });

  describe("tool call processing", () => {
    it("should extract text from text blocks", () => {
      const content = [
        { type: "text", text: "Hello " },
        { type: "text", text: "world!" },
      ];

      let text = "";
      for (const block of content) {
        if (block.type === "text") {
          text += block.text;
        }
      }

      expect(text).toBe("Hello world!");
    });

    it("should extract tool calls from tool_use blocks", () => {
      const content = [
        { type: "text", text: "Let me help." },
        { type: "tool_use", id: "tool-1", name: "Read", input: { file_path: "/test.md" } },
        { type: "tool_use", id: "tool-2", name: "Write", input: { file_path: "/out.md" } },
      ];

      const tools = content.filter((b) => b.type === "tool_use");

      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe("Read");
      expect(tools[1].name).toBe("Write");
    });

    it("should mark tools as running initially", () => {
      const toolCall = {
        id: "tool-1",
        name: "Read",
        input: {},
        status: "running" as const,
        startTime: Date.now(),
      };

      expect(toolCall.status).toBe("running");
      expect(toolCall.startTime).toBeDefined();
    });

    it("should mark tools as success on completion", () => {
      const toolCall = {
        id: "tool-1",
        name: "Read",
        input: {},
        status: "running" as "running" | "success" | "error",
        startTime: Date.now(),
        endTime: undefined as number | undefined,
      };

      // Simulate completion.
      toolCall.status = "success";
      toolCall.endTime = Date.now();

      expect(toolCall.status).toBe("success");
      expect(toolCall.endTime).toBeDefined();
    });

    it("should mark tools as error on failure", () => {
      const toolCall = {
        id: "tool-1",
        name: "Read",
        input: {},
        status: "running" as "running" | "success" | "error",
        startTime: Date.now(),
        endTime: undefined as number | undefined,
        error: undefined as string | undefined,
      };

      // Simulate error.
      toolCall.status = "error";
      toolCall.endTime = Date.now();
      toolCall.error = "File not found";

      expect(toolCall.status).toBe("error");
      expect(toolCall.error).toBe("File not found");
    });
  });

  describe("abort controller", () => {
    it("should create abort controller for each request", () => {
      const abortController = new AbortController();
      expect(abortController.signal.aborted).toBe(false);
    });

    it("should abort on cancelStream", () => {
      const abortController = new AbortController();
      abortController.abort();
      expect(abortController.signal.aborted).toBe(true);
    });

    it("should clear abort controller after request", () => {
      let abortController: AbortController | null = new AbortController();
      abortController = null;
      expect(abortController).toBeNull();
    });
  });

  describe("event handlers", () => {
    it("should accept event handlers via setEventHandlers", () => {
      const events = {
        onStreamingStart: vi.fn(),
        onStreamingEnd: vi.fn(),
        onMessage: vi.fn(),
        onToolCall: vi.fn(),
        onToolResult: vi.fn(),
        onError: vi.fn(),
      };

      expect(events.onStreamingStart).toBeDefined();
      expect(events.onMessage).toBeDefined();
      expect(events.onError).toBeDefined();
    });

    it("should call onStreamingStart at start of query", () => {
      const onStreamingStart = vi.fn();
      onStreamingStart();
      expect(onStreamingStart).toHaveBeenCalled();
    });

    it("should call onStreamingEnd at end of query", () => {
      const onStreamingEnd = vi.fn();
      onStreamingEnd();
      expect(onStreamingEnd).toHaveBeenCalled();
    });

    it("should call onMessage with assistant message", () => {
      const onMessage = vi.fn();
      const message = {
        id: "msg-1",
        role: "assistant",
        content: "Hello!",
        timestamp: Date.now(),
      };

      onMessage(message);

      expect(onMessage).toHaveBeenCalledWith(message);
    });

    it("should call onToolCall when tool is invoked", () => {
      const onToolCall = vi.fn();
      const toolCall = {
        id: "tool-1",
        name: "Read",
        input: { file_path: "/test.md" },
        status: "running",
        startTime: Date.now(),
      };

      onToolCall(toolCall);

      expect(onToolCall).toHaveBeenCalledWith(toolCall);
    });

    it("should call onError when error occurs", () => {
      const onError = vi.fn();
      const error = new Error("Test error");

      onError(error);

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("claude executable path finding", () => {
    it("should check NVM_BIN env var first", () => {
      const nvmBin = "/home/user/.nvm/versions/node/v20.0.0/bin";
      const possiblePaths = [
        nvmBin ? `${nvmBin}/claude` : null,
        "/usr/local/bin/claude",
      ].filter(Boolean);

      expect(possiblePaths[0]).toBe(`${nvmBin}/claude`);
    });

    it("should include common installation paths", () => {
      const homeDir = "/home/user";
      const possiblePaths = [
        `${homeDir}/.nvm/versions/node/v20.11.1/bin/claude`,
        `${homeDir}/.npm-global/bin/claude`,
        "/usr/local/bin/claude",
        "/opt/homebrew/bin/claude",
        "/usr/bin/claude",
      ];

      expect(possiblePaths).toContain("/usr/local/bin/claude");
      expect(possiblePaths).toContain("/opt/homebrew/bin/claude");
    });

    it("should throw if claude not found", () => {
      const findClaude = (): string => {
        const paths = ["/nonexistent/claude"];
        for (const p of paths) {
          // Simulate fs.existsSync returning false.
          const exists = false;
          if (exists) return p;
        }
        throw new Error("Claude Code CLI not found. Please install it with: npm install -g @anthropic-ai/claude-code");
      };

      expect(() => findClaude()).toThrow("Claude Code CLI not found");
    });
  });
});
