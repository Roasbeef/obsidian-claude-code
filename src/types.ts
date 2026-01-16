import { ItemView } from "obsidian";

// View type constant for registration.
export const CHAT_VIEW_TYPE = "claude-code-chat-view";

// Plugin settings interface.
export interface ClaudeCodeSettings {
  // API Configuration.
  apiKey: string;
  baseUrl: string;
  model: string;

  // Permissions.
  autoApproveVaultReads: boolean;
  autoApproveVaultWrites: boolean;
  requireBashApproval: boolean;

  // Persistent permission approvals (tools that are always allowed).
  alwaysAllowedTools: string[];

  // UI Preferences.
  sidebarWidth: number;

  // Limits.
  maxBudgetPerSession: number;

  // Agent SDK settings.
  maxTurns: number;
}

// Default settings values.
export const DEFAULT_SETTINGS: ClaudeCodeSettings = {
  apiKey: "",
  baseUrl: "",
  model: "sonnet",
  autoApproveVaultReads: true,
  autoApproveVaultWrites: true,  // Default to auto-approve for better UX.
  requireBashApproval: true,
  alwaysAllowedTools: [],
  sidebarWidth: 400,
  maxBudgetPerSession: 10.0,
  maxTurns: 50,
};

// Error classification for retry and display logic.
export type ErrorType = "transient" | "auth" | "network" | "permanent";

// Error with classification for better handling.
export interface ClassifiedError extends Error {
  errorType: ErrorType;
}

// Message roles for conversation.
export type MessageRole = "user" | "assistant";

// Chat message structure.
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

// Subagent status for lifecycle tracking.
export type SubagentStatus = "starting" | "running" | "thinking" | "completed" | "interrupted" | "error";

// Subagent progress information.
export interface SubagentProgress {
  message?: string;
  startTime: number;
  lastUpdate: number;
}

// Tool call information for display.
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "success" | "error";
  error?: string;
  startTime: number;
  endTime?: number;

  // Subagent-specific fields for Task tool calls.
  isSubagent?: boolean;
  subagentId?: string;
  subagentType?: string;
  subagentStatus?: SubagentStatus;
  subagentProgress?: SubagentProgress;
}

// Conversation metadata (SDK handles actual state).
export interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  metadata: {
    totalTokens: number;
    totalCostUsd: number;
  };
}

// Context that can be attached to a message.
export interface MessageContext {
  type: "file" | "selection" | "search";
  path?: string;
  content: string;
  label: string;
}

// Events emitted by the agent controller.
export interface AgentEvents {
  onMessage: (message: ChatMessage) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (toolCallId: string, result: string, isError: boolean) => void;
  onStreamingStart: () => void;
  onStreamingEnd: () => void;
  onError: (error: Error) => void;

  // Subagent lifecycle events.
  onSubagentStart?: (toolCallId: string, subagentType: string, subagentId: string) => void;
  onSubagentStop?: (toolCallId: string, success: boolean, error?: string) => void;
  onSubagentProgress?: (toolCallId: string, message: string) => void;
}

// Permission request for tool approval.
export interface PermissionRequest {
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
  risk: "low" | "medium" | "high";
}

// Slash command definition.
export interface SlashCommand {
  name: string;
  description: string;
  path: string;
  template: string;
}

// File suggestion for autocomplete.
export interface FileSuggestion {
  path: string;
  name: string;
  isFolder: boolean;
}

// Queued message for async message queueing while Claude is working.
export interface QueuedMessage {
  id: string;
  content: string;
  timestamp: number;
}
