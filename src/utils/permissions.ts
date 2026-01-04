// Pure utility functions for tool permission classification.
// Extracted from AgentController.ts for testability.

/**
 * Read-only tools that are always auto-approved.
 * These tools don't modify the vault or system.
 */
export const READ_ONLY_TOOLS = [
  "Read",
  "Glob",
  "Grep",
  "LS",
  "mcp__obsidian__get_active_file",
  "mcp__obsidian__get_vault_stats",
  "mcp__obsidian__get_recent_files",
  "mcp__obsidian__list_commands",
] as const;

/**
 * File write tools that may require user approval.
 */
export const WRITE_TOOLS = ["Write", "Edit", "MultiEdit"] as const;

/**
 * Obsidian UI tools that are safe to auto-approve.
 * These affect the UI but don't modify user data.
 */
export const OBSIDIAN_UI_TOOLS = [
  "mcp__obsidian__open_file",
  "mcp__obsidian__show_notice",
  "mcp__obsidian__reveal_in_explorer",
  "mcp__obsidian__execute_command",
  "mcp__obsidian__create_note",
] as const;

/**
 * Tools that spawn subagents (always auto-approved, they request their own permissions).
 */
export const SUBAGENT_TOOLS = ["Task"] as const;

/**
 * Shell/system tools that may require approval.
 */
export const SYSTEM_TOOLS = ["Bash"] as const;

// Type aliases for tool categories.
export type ReadOnlyTool = (typeof READ_ONLY_TOOLS)[number];
export type WriteTool = (typeof WRITE_TOOLS)[number];
export type ObsidianUiTool = (typeof OBSIDIAN_UI_TOOLS)[number];
export type SubagentTool = (typeof SUBAGENT_TOOLS)[number];
export type SystemTool = (typeof SYSTEM_TOOLS)[number];

/**
 * Check if a tool is read-only (always auto-approved).
 */
export function isReadOnlyTool(toolName: string): boolean {
  return (READ_ONLY_TOOLS as readonly string[]).includes(toolName);
}

/**
 * Check if a tool is a file write tool.
 */
export function isWriteTool(toolName: string): boolean {
  return (WRITE_TOOLS as readonly string[]).includes(toolName);
}

/**
 * Check if a tool is an Obsidian UI tool (safe to auto-approve).
 */
export function isObsidianUiTool(toolName: string): boolean {
  return (OBSIDIAN_UI_TOOLS as readonly string[]).includes(toolName);
}

/**
 * Check if a tool spawns subagents.
 */
export function isSubagentTool(toolName: string): boolean {
  return (SUBAGENT_TOOLS as readonly string[]).includes(toolName);
}

/**
 * Check if a tool is a system/shell tool.
 */
export function isSystemTool(toolName: string): boolean {
  return (SYSTEM_TOOLS as readonly string[]).includes(toolName);
}

/**
 * Permission risk level for a tool.
 */
export type RiskLevel = "none" | "low" | "medium" | "high";

/**
 * Determine the risk level of a tool.
 */
export function getToolRiskLevel(toolName: string): RiskLevel {
  if (isReadOnlyTool(toolName)) return "none";
  if (isObsidianUiTool(toolName)) return "low";
  if (isWriteTool(toolName)) return "medium";
  if (isSystemTool(toolName)) return "high";
  if (isSubagentTool(toolName)) return "low";  // Subagents request their own permissions.
  return "low";  // Default for unknown tools.
}

/**
 * Determine if a tool should be auto-approved without user interaction.
 */
export function shouldAutoApprove(
  toolName: string,
  settings: {
    autoApproveVaultWrites: boolean;
    requireBashApproval: boolean;
    alwaysAllowedTools: string[];
  }
): boolean {
  // Always auto-approve read-only tools.
  if (isReadOnlyTool(toolName)) return true;

  // Always auto-approve Obsidian UI tools.
  if (isObsidianUiTool(toolName)) return true;

  // Check if tool is in always-allowed list.
  if (settings.alwaysAllowedTools.includes(toolName)) return true;

  // Check write tool settings.
  if (isWriteTool(toolName)) {
    return settings.autoApproveVaultWrites;
  }

  // Check Bash settings.
  if (isSystemTool(toolName)) {
    return !settings.requireBashApproval;
  }

  // Auto-approve subagent tools.
  if (isSubagentTool(toolName)) return true;

  // Default: auto-approve unknown tools.
  return true;
}

/**
 * Build a user-friendly description of a tool's action.
 */
export function buildToolDescription(toolName: string, input: Record<string, unknown>): string {
  if (isWriteTool(toolName)) {
    const filePath = (input.file_path as string) || (input.path as string) || "a file";
    return `Claude wants to ${toolName.toLowerCase()} the file: ${filePath}`;
  }

  if (toolName === "Bash") {
    const command = (input.command as string) || "";
    const truncated = command.length > 100 ? command.slice(0, 100) + "..." : command;
    return `Claude wants to run a shell command: ${truncated}`;
  }

  return `Claude wants to use the ${toolName} tool.`;
}
