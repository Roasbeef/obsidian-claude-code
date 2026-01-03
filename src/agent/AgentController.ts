import { query, SDKMessage, SDKAssistantMessage, SDKResultMessage, SDKSystemMessage, SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { App } from "obsidian";
import type ClaudeCodePlugin from "../main";
import { ChatMessage, ToolCall, AgentEvents, SubagentProgress } from "../types";
import { createObsidianMcpServer, ObsidianMcpServerInstance } from "./ObsidianMcpServer";
import { logger } from "../utils/Logger";

// Type for content blocks from the SDK.
interface TextBlock {
  type: "text";
  text: string;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ContentBlock = TextBlock | ToolUseBlock;

export class AgentController {
  private plugin: ClaudeCodePlugin;
  private app: App;
  private vaultPath: string;
  private obsidianMcp: ObsidianMcpServerInstance;
  private abortController: AbortController | null = null;
  private events: Partial<AgentEvents> = {};
  private sessionId: string | null = null;

  // Permission memory for "remember this session".
  private approvedTools: Set<string> = new Set();

  // Subagent tracking: maps SDK subagentId to our toolCallId.
  private pendingSubagents: Map<string, string> = new Map();

  // Track current tool calls for subagent matching.
  private currentToolCalls: ToolCall[] = [];

  constructor(plugin: ClaudeCodePlugin) {
    this.plugin = plugin;
    this.app = plugin.app;
    this.vaultPath = this.getVaultPath();
    this.obsidianMcp = createObsidianMcpServer(this.app, this.vaultPath);
  }

  private getVaultPath(): string {
    const adapter = this.plugin.app.vault.adapter as any;
    return adapter.basePath || "";
  }

  // Set event handlers for UI updates.
  setEventHandlers(events: Partial<AgentEvents>) {
    this.events = events;
  }

  // Send a message and get a response using the Agent SDK.
  async sendMessage(content: string): Promise<ChatMessage> {
    logger.info("AgentController", "sendMessage called", { contentLength: content.length, preview: content.slice(0, 50) });

    this.abortController = new AbortController();
    this.events.onStreamingStart?.();

    const toolCalls: ToolCall[] = [];
    this.currentToolCalls = toolCalls;  // Store reference for subagent matching.
    let finalContent = "";
    let messageId = this.generateId();

    try {
      // Build environment with API key if set in settings.
      const env: Record<string, string | undefined> = { ...process.env };
      if (this.plugin.settings.apiKey) {
        env.ANTHROPIC_API_KEY = this.plugin.settings.apiKey;
        logger.debug("AgentController", "Using API key from settings");
      }

      const hasOAuthToken = !!env.CLAUDE_CODE_OAUTH_TOKEN;
      const hasApiKey = !!env.ANTHROPIC_API_KEY;
      logger.info("AgentController", "Auth status", { hasOAuthToken, hasApiKey, model: this.plugin.settings.model, cwd: this.vaultPath });

      // Find the Claude Code executable path.
      const claudeExecutable = this.findClaudeExecutable();

      // Ensure nvm's node is in PATH for the subprocess.
      // The claude CLI is a node script (#!/usr/bin/env node) so node must be findable.
      const path = require("path");
      const claudeDir = path.dirname(claudeExecutable);
      if (env.PATH && !env.PATH.includes(claudeDir)) {
        env.PATH = `${claudeDir}:${env.PATH}`;
      } else if (!env.PATH) {
        env.PATH = claudeDir;
      }
      logger.info("AgentController", "Starting query()", { claudeExecutable, pathAddition: claudeDir });

      for await (const message of query({
        // Use simple string prompt for cleaner API.
        prompt: content,
        options: {
          cwd: this.vaultPath,
          abortController: this.abortController,

          // Pass environment with API key.
          env,

          // Explicitly set the Claude Code executable path.
          // This is required in bundled environments like Obsidian where import.meta.url doesn't work.
          pathToClaudeCodeExecutable: claudeExecutable,

          // Model selection using simplified names (sonnet, opus, haiku).
          model: this.plugin.settings.model || "sonnet",

          // Load project settings including CLAUDE.md and skills.
          settingSources: ["project"],

          // Use Claude Code's system prompt and tools.
          systemPrompt: { type: "preset", preset: "claude_code" },
          tools: { type: "preset", preset: "claude_code" },

          // Add our Obsidian-specific tools.
          mcpServers: {
            obsidian: this.obsidianMcp,
          },

          // Include streaming updates for real-time UI.
          includePartialMessages: true,

          // Budget limit from settings.
          maxBudgetUsd: this.plugin.settings.maxBudgetPerSession,

          // Resume session if available.
          resume: this.sessionId ?? undefined,

          // Permission handling.
          canUseTool: async (toolName, input) => {
            return this.handlePermission(toolName, input);
          },

          // Note: SDK hooks use shell command matchers, not inline callbacks.
          // Subagent lifecycle is tracked through tool call state transitions.
        },
      })) {
        logger.debug("AgentController", "Received SDK message", { type: message.type, subtype: (message as any).subtype });

        // Process different message types.
        if (message.type === "system" && message.subtype === "init") {
          // Store session ID for resumption.
          this.sessionId = message.session_id;
          logger.info("AgentController", `Session initialized: ${this.sessionId}`);
          logger.info("AgentController", `Available tools: ${message.tools.join(", ")}`);
        } else if (message.type === "stream_event") {
          // Handle streaming partial messages for real-time UI updates.
          this.handleStreamEvent(message, messageId);
        } else if (message.type === "assistant") {
          // Handle complete assistant messages.
          const assistantMsg = message as SDKAssistantMessage;
          const { text, tools } = this.processAssistantMessage(assistantMsg);

          // If we have existing tool calls and receive a new assistant message with text,
          // the tools must have completed (SDK executes tools between assistant turns).
          if (text && toolCalls.length > 0) {
            for (const tc of toolCalls) {
              if (tc.status === "running") {
                tc.status = "success";
                tc.endTime = Date.now();

                // Handle subagent completion.
                if (tc.isSubagent) {
                  tc.subagentStatus = "completed";
                  if (tc.subagentProgress) {
                    tc.subagentProgress.message = "Completed";
                    tc.subagentProgress.lastUpdate = Date.now();
                  }
                  this.events.onSubagentStop?.(tc.id, true, undefined);
                }

                this.events.onToolResult?.(tc.id, "", false);
              }
            }
          }

          finalContent = text;

          // Update tool calls.
          for (const tool of tools) {
            const existing = toolCalls.find((t) => t.id === tool.id);
            if (!existing) {
              toolCalls.push(tool);
              this.events.onToolCall?.(tool);
            }
          }

          // Emit streaming update.
          this.events.onMessage?.({
            id: messageId,
            role: "assistant",
            content: finalContent,
            timestamp: Date.now(),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            isStreaming: true,
          });
        } else if (message.type === "result") {
          // Handle result messages.
          const resultMsg = message as SDKResultMessage;
          if (resultMsg.subtype === "success") {
            logger.info("AgentController", `Query completed: ${resultMsg.num_turns} turns, $${resultMsg.total_cost_usd.toFixed(4)}`);
            // Final result text may be in resultMsg.result.
            if (resultMsg.result && !finalContent) {
              finalContent = resultMsg.result;
            }

            // Mark any remaining running tools as success on completion.
            for (const tc of toolCalls) {
              if (tc.status === "running") {
                tc.status = "success";
                tc.endTime = Date.now();
              }
            }

            // Emit final message update with completed tool statuses.
            this.events.onMessage?.({
              id: messageId,
              role: "assistant",
              content: finalContent,
              timestamp: Date.now(),
              toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
              isStreaming: false,
            });
          } else {
            // Handle errors.
            logger.error("AgentController", "Query failed", { subtype: resultMsg.subtype, result: resultMsg });

            // Mark any running tools as error.
            for (const tc of toolCalls) {
              if (tc.status === "running") {
                tc.status = "error";
                tc.endTime = Date.now();

                // Handle subagent error.
                if (tc.isSubagent) {
                  tc.subagentStatus = "error";
                  if (tc.subagentProgress) {
                    tc.subagentProgress.message = "Error during execution";
                    tc.subagentProgress.lastUpdate = Date.now();
                  }
                  this.events.onSubagentStop?.(tc.id, false, "Error during execution");
                }
              }
            }

            // Emit error state update.
            this.events.onMessage?.({
              id: messageId,
              role: "assistant",
              content: finalContent,
              timestamp: Date.now(),
              toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
              isStreaming: false,
            });

            const errors = (resultMsg as any).errors || [];
            if (errors.length > 0) {
              throw new Error(errors.join("\n"));
            }
          }
        }
      }

      logger.info("AgentController", "sendMessage returning response", { contentLength: finalContent.length, toolCallCount: toolCalls.length });
      return {
        id: messageId,
        role: "assistant",
        content: finalContent,
        timestamp: Date.now(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        isStreaming: false,
      };
    } catch (error) {
      logger.error("AgentController", "sendMessage error", { error: String(error), name: (error as Error).name, stack: (error as Error).stack });
      if ((error as Error).name !== "AbortError") {
        this.events.onError?.(
          error instanceof Error ? error : new Error(String(error))
        );
      }
      throw error;
    } finally {
      this.abortController = null;
      this.events.onStreamingEnd?.();
    }
  }

  // Process assistant message content blocks.
  private processAssistantMessage(
    message: SDKAssistantMessage
  ): { text: string; tools: ToolCall[] } {
    let text = "";
    const tools: ToolCall[] = [];

    const content = message.message.content as ContentBlock[];
    for (const block of content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        const toolCall: ToolCall = {
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
          status: "running",
          startTime: Date.now(),
        };

        // Detect Task tools and initialize subagent tracking.
        if (block.name === "Task") {
          const input = block.input as Record<string, unknown>;
          const subagentType = (input.subagent_type as string) || "unknown";

          toolCall.isSubagent = true;
          toolCall.subagentType = subagentType;
          toolCall.subagentStatus = "running";  // Start as running since the task is executing.
          toolCall.subagentProgress = {
            message: `${subagentType} agent running...`,
            startTime: Date.now(),
            lastUpdate: Date.now(),
          };

          logger.info("AgentController", "Task tool detected", {
            toolCallId: toolCall.id,
            subagentType: toolCall.subagentType,
            description: input.description,
          });

          // Emit subagent start event for UI update.
          // Use setTimeout to ensure the tool call is added to the list first.
          setTimeout(() => {
            this.events.onSubagentStart?.(toolCall.id, subagentType, toolCall.id);
          }, 0);
        }

        tools.push(toolCall);
      }
    }

    return { text, tools };
  }

  // Handle streaming events for real-time UI updates.
  private handleStreamEvent(message: SDKPartialAssistantMessage, messageId: string) {
    const event = message.event;

    if (event.type === "content_block_delta") {
      if ((event.delta as any).type === "text_delta") {
        // Text is being streamed - we'll get full content in assistant message.
      }
    }
  }

  // Handle permission requests.
  private async handlePermission(
    toolName: string,
    input: any
  ): Promise<{ behavior: "allow"; updatedInput: any } | { behavior: "deny"; message: string }> {
    // Auto-approve read-only operations.
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

    if (readOnlyTools.includes(toolName)) {
      return { behavior: "allow", updatedInput: input };
    }

    // Auto-approve Obsidian UI tools (safe operations).
    const obsidianUiTools = [
      "mcp__obsidian__open_file",
      "mcp__obsidian__show_notice",
      "mcp__obsidian__reveal_in_explorer",
      "mcp__obsidian__execute_command",
      "mcp__obsidian__create_note",
    ];

    if (obsidianUiTools.includes(toolName)) {
      return { behavior: "allow", updatedInput: input };
    }

    // Check if tool is in the always-allowed list (persistent setting).
    if (this.plugin.settings.alwaysAllowedTools.includes(toolName)) {
      return { behavior: "allow", updatedInput: input };
    }

    // Check settings for file write operations.
    const writeTools = ["Write", "Edit", "MultiEdit"];
    if (writeTools.includes(toolName)) {
      if (this.plugin.settings.autoApproveVaultWrites) {
        return { behavior: "allow", updatedInput: input };
      }
      // Check if already approved for this session.
      if (this.approvedTools.has(toolName)) {
        return { behavior: "allow", updatedInput: input };
      }
      // Show permission modal for writes.
      const result = await this.showPermissionModal(toolName, input, "medium");
      if (result.approved) {
        await this.handlePermissionChoice(toolName, result.choice);
        return { behavior: "allow", updatedInput: input };
      }
      return { behavior: "deny", message: "User denied file write permission" };
    }

    // Check settings for bash commands.
    if (toolName === "Bash") {
      if (!this.plugin.settings.requireBashApproval) {
        return { behavior: "allow", updatedInput: input };
      }
      // Check if already approved for this session.
      if (this.approvedTools.has("Bash")) {
        return { behavior: "allow", updatedInput: input };
      }
      // Show permission modal for bash.
      const result = await this.showPermissionModal(toolName, input, "high");
      if (result.approved) {
        await this.handlePermissionChoice("Bash", result.choice);
        return { behavior: "allow", updatedInput: input };
      }
      return { behavior: "deny", message: "User denied bash command permission" };
    }

    // Auto-approve Task/subagent tools (they'll request their own permissions).
    if (toolName === "Task") {
      return { behavior: "allow", updatedInput: input };
    }

    // Default: allow other tools (web search, etc.).
    return { behavior: "allow", updatedInput: input };
  }

  // Handle the user's permission choice (session vs always).
  private async handlePermissionChoice(toolName: string, choice: "once" | "session" | "always") {
    if (choice === "session") {
      this.approvedTools.add(toolName);
    } else if (choice === "always") {
      // Add to persistent settings.
      if (!this.plugin.settings.alwaysAllowedTools.includes(toolName)) {
        this.plugin.settings.alwaysAllowedTools.push(toolName);
        await this.plugin.saveSettings();
        logger.info("AgentController", `Added ${toolName} to always-allowed tools`);
      }
    }
  }

  // Show a permission modal and wait for user response.
  private showPermissionModal(
    toolName: string,
    input: any,
    risk: "low" | "medium" | "high"
  ): Promise<{ approved: boolean; choice: "once" | "session" | "always" }> {
    return new Promise((resolve) => {
      const { PermissionModal } = require("../views/PermissionModal");

      // Build a description based on the tool.
      let description = `Claude wants to use the ${toolName} tool.`;
      if (toolName === "Edit" || toolName === "Write") {
        const filePath = input.file_path || input.path || "a file";
        description = `Claude wants to ${toolName.toLowerCase()} the file: ${filePath}`;
      } else if (toolName === "Bash") {
        const command = input.command || "";
        description = `Claude wants to run a shell command: ${command.slice(0, 100)}${command.length > 100 ? "..." : ""}`;
      }

      const modal = new PermissionModal(
        this.app,
        {
          toolName,
          toolInput: input,
          description,
          risk,
        },
        (choice: "once" | "session" | "always") => resolve({ approved: true, choice }),  // onApprove
        () => resolve({ approved: false, choice: "once" })  // onDeny
      );
      modal.open();
    });
  }

  // Handle SubagentStart hook event.
  private handleSubagentStart(event: any) {
    const { subagent_id, subagent_type, task_description } = event;
    logger.info("AgentController", "SubagentStart hook fired", {
      subagentId: subagent_id,
      subagentType: subagent_type,
      description: task_description?.slice(0, 100),
    });

    // Find the Task tool call that matches this subagent.
    const toolCall = this.findToolCallForSubagent(task_description, subagent_type);
    if (toolCall) {
      this.pendingSubagents.set(subagent_id, toolCall.id);
      toolCall.subagentId = subagent_id;
      toolCall.subagentStatus = "running";
      if (toolCall.subagentProgress) {
        toolCall.subagentProgress.message = `${subagent_type} agent running...`;
        toolCall.subagentProgress.lastUpdate = Date.now();
      }

      // Emit event for UI update.
      this.events.onSubagentStart?.(toolCall.id, subagent_type || "unknown", subagent_id);
      logger.info("AgentController", "Matched subagent to tool call", {
        toolCallId: toolCall.id,
        subagentId: subagent_id,
      });
    } else {
      logger.warn("AgentController", "Could not match subagent to tool call", {
        subagentId: subagent_id,
        description: task_description,
      });
    }
  }

  // Handle SubagentStop hook event.
  private handleSubagentStop(event: any) {
    const { subagent_id, success, error } = event;
    logger.info("AgentController", "SubagentStop hook fired", {
      subagentId: subagent_id,
      success,
      error,
    });

    const toolCallId = this.pendingSubagents.get(subagent_id);
    if (toolCallId) {
      // Find the tool call and update its status.
      const toolCall = this.currentToolCalls.find((tc) => tc.id === toolCallId);
      if (toolCall) {
        toolCall.subagentStatus = success ? "completed" : "error";
        if (error && !toolCall.error) {
          toolCall.error = error;
        }
        if (toolCall.subagentProgress) {
          toolCall.subagentProgress.message = success ? "Completed" : `Error: ${error || "Unknown error"}`;
          toolCall.subagentProgress.lastUpdate = Date.now();
        }
      }

      // Emit event for UI update.
      this.events.onSubagentStop?.(toolCallId, success, error);
      this.pendingSubagents.delete(subagent_id);

      logger.info("AgentController", "Subagent stopped", {
        toolCallId,
        subagentId: subagent_id,
        success,
      });
    } else {
      logger.warn("AgentController", "SubagentStop for unknown subagent", { subagentId: subagent_id });
    }
  }

  // Find a Task tool call that matches a subagent by description or type.
  private findToolCallForSubagent(description?: string, subagentType?: string): ToolCall | undefined {
    // Look for Task tool calls that are in "starting" state (not yet matched).
    for (const tc of this.currentToolCalls) {
      if (tc.isSubagent && tc.subagentStatus === "starting" && !tc.subagentId) {
        // Match by subagent type if provided.
        if (subagentType && tc.subagentType === subagentType) {
          return tc;
        }
        // Match by description similarity if provided.
        if (description) {
          const tcDesc = (tc.input.description as string) || "";
          if (tcDesc && description.includes(tcDesc.slice(0, 50))) {
            return tc;
          }
        }
        // Fallback: return the first unmatched Task.
        return tc;
      }
    }
    return undefined;
  }

  // Cancel the current streaming request.
  cancelStream() {
    if (this.abortController) {
      // Mark any running subagents as interrupted.
      for (const [subagentId, toolCallId] of this.pendingSubagents) {
        logger.info("AgentController", "Interrupting subagent due to cancellation", { subagentId, toolCallId });

        // Update the tool call status.
        const toolCall = this.currentToolCalls.find((tc) => tc.id === toolCallId);
        if (toolCall) {
          toolCall.subagentStatus = "interrupted";
          if (toolCall.subagentProgress) {
            toolCall.subagentProgress.message = "Cancelled by user";
            toolCall.subagentProgress.lastUpdate = Date.now();
          }
        }

        // Emit stop event.
        this.events.onSubagentStop?.(toolCallId, false, "User cancelled");
      }
      this.pendingSubagents.clear();

      this.abortController.abort();
      this.abortController = null;
    }
  }

  // Clear conversation history (starts a new session).
  clearHistory() {
    this.sessionId = null;
  }

  // Get the current session ID.
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Resume a previous session.
  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  // Check if the client is ready (has some form of authentication).
  isReady(): boolean {
    return !!(
      this.plugin.settings.apiKey ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_CODE_OAUTH_TOKEN
    );
  }

  // Generate a unique message ID.
  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // Find the Claude Code executable path.
  private findClaudeExecutable(): string {
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const homeDir = os.homedir();

    // Common locations to check.
    const possiblePaths = [
      // User's npm global bin from NVM_BIN env var.
      process.env.NVM_BIN ? `${process.env.NVM_BIN}/claude` : null,

      // Common nvm paths - check multiple node versions.
      `${homeDir}/.nvm/versions/node/v20.11.1/bin/claude`,
      `${homeDir}/.nvm/versions/node/v22.0.0/bin/claude`,
      `${homeDir}/.nvm/versions/node/v21.0.0/bin/claude`,
      `${homeDir}/.nvm/versions/node/v18.0.0/bin/claude`,

      // npm global without nvm.
      `${homeDir}/.npm-global/bin/claude`,
      `${homeDir}/npm/bin/claude`,

      // Standard npm global.
      "/usr/local/bin/claude",

      // Homebrew on macOS.
      "/opt/homebrew/bin/claude",

      // Linux global.
      "/usr/bin/claude",
    ].filter(Boolean) as string[];

    // Also check all nvm versions dynamically.
    const nvmDir = `${homeDir}/.nvm/versions/node`;
    try {
      if (fs.existsSync(nvmDir)) {
        const versions = fs.readdirSync(nvmDir);
        for (const ver of versions) {
          const claudePath = path.join(nvmDir, ver, "bin", "claude");
          if (!possiblePaths.includes(claudePath)) {
            possiblePaths.push(claudePath);
          }
        }
      }
    } catch (e) {
      // Ignore.
    }

    // Check if any exist.
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          logger.info("AgentController", "Found Claude executable", { path: p });
          return p;
        }
      } catch (e) {
        // Ignore.
      }
    }

    // Log all paths we checked.
    logger.error("AgentController", "Could not find Claude executable", { checkedPaths: possiblePaths });
    throw new Error("Claude Code CLI not found. Please install it with: npm install -g @anthropic-ai/claude-code");
  }
}
