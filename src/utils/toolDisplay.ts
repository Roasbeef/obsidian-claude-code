// Pure utility functions for tool call display logic.
// Extracted from ToolCallDisplay.ts for testability.

import type { ToolCall } from "../types";

// Subagent status type for external use.
export type SubagentStatus = "starting" | "running" | "thinking" | "completed" | "interrupted" | "error";
export type ToolStatus = "pending" | "running" | "success" | "error";

/**
 * Get a friendly display name for a tool.
 * Handles special cases like Skill, Task, and MCP tools.
 */
export function getToolDisplayName(name: string, input: Record<string, unknown>): string {
  // For Skill tool, show which skill is being invoked.
  if (name === "Skill" && input.skill) {
    return `Skill: ${input.skill}`;
  }

  // For Task/subagent tool, show the agent type.
  if (name === "Task" && input.subagent_type) {
    return `Task: ${input.subagent_type}`;
  }

  // For MCP tools, make the name more readable.
  if (name.startsWith("mcp__obsidian__")) {
    const shortName = name.replace("mcp__obsidian__", "");
    return shortName.replace(/_/g, " ");
  }

  return name;
}

/**
 * Get a brief summary of tool input for display.
 * Extracts the most relevant piece of information from the input.
 */
export function getToolInputSummary(name: string, input: Record<string, unknown>): string {
  // Special handling for Skill - show the skill arguments.
  if (name === "Skill" && input.args) {
    const args = String(input.args);
    return args.length > 40 ? args.slice(0, 40) + "..." : args;
  }

  // Special handling for Task - show the description.
  if (name === "Task" && input.description) {
    return String(input.description);
  }

  // Try to get a meaningful summary based on common input patterns.
  if (input.file_path) {
    return String(input.file_path).split("/").pop() || "";
  }
  if (input.path) {
    return String(input.path).split("/").pop() || "";
  }
  if (input.pattern) {
    return String(input.pattern);
  }
  if (input.command) {
    const cmd = String(input.command);
    return cmd.length > 30 ? cmd.slice(0, 30) + "..." : cmd;
  }
  if (input.query) {
    const q = String(input.query);
    return q.length > 30 ? q.slice(0, 30) + "..." : q;
  }

  // Fallback: show number of keys.
  const keys = Object.keys(input);
  return keys.length > 0 ? `${keys.length} params` : "";
}

/**
 * Get the status text to display for a tool call.
 * Prioritizes subagent status over tool status.
 */
export function getToolStatusText(
  status: ToolStatus,
  isSubagent: boolean,
  subagentStatus?: SubagentStatus
): string {
  // For subagents, use the subagent-specific status.
  if (isSubagent && subagentStatus) {
    switch (subagentStatus) {
      case "starting":
        return "starting...";
      case "running":
        return "running...";
      case "thinking":
        return "thinking...";
      case "completed":
        return "✓";
      case "interrupted":
        return "⚠ interrupted";
      case "error":
        return "✗";
    }
  }

  // Fallback to standard tool status.
  switch (status) {
    case "pending":
      return "pending";
    case "running":
      return "running...";
    case "success":
      return "✓";
    case "error":
      return "✗";
    default:
      return "";
  }
}

/**
 * Get the CSS class for a tool's status indicator.
 */
export function getToolStatusClass(
  status: ToolStatus,
  isSubagent: boolean,
  subagentStatus?: SubagentStatus
): string {
  // For subagents, use the subagent-specific status class.
  if (isSubagent && subagentStatus) {
    return subagentStatus;
  }
  return status;
}

/**
 * Check if a subagent is in a running state.
 */
export function isSubagentRunning(subagentStatus?: SubagentStatus): boolean {
  return subagentStatus === "starting" || subagentStatus === "running" || subagentStatus === "thinking";
}

/**
 * Determine if a tool call represents a subagent (Task tool).
 */
export function isSubagentTool(name: string): boolean {
  return name === "Task";
}

/**
 * Extract the subagent type from a Task tool's input.
 */
export function getSubagentType(input: Record<string, unknown>): string {
  return (input.subagent_type as string) || "unknown";
}
