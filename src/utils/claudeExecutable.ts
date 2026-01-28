/**
 * Utility for finding the Claude Code CLI executable.
 * Shared between AgentController and ConversationManager.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { logger } from "./Logger";

/**
 * Find the Claude Code CLI executable path.
 * Searches common installation locations including nvm-managed Node versions.
 * @returns The path to the Claude executable, or undefined if not found.
 */
export function findClaudeExecutable(): string | undefined {
  const homeDir = os.homedir();

  // Common locations to check.
  const possiblePaths: string[] = [
    // User's npm global bin from NVM_BIN env var.
    process.env.NVM_BIN ? `${process.env.NVM_BIN}/claude` : null,

    // Common nvm paths - check multiple node versions.
    `${homeDir}/.nvm/versions/node/v20.11.1/bin/claude`,
    `${homeDir}/.nvm/versions/node/v22.0.0/bin/claude`,
    `${homeDir}/.nvm/versions/node/v21.0.0/bin/claude`,
    `${homeDir}/.nvm/versions/node/v18.0.0/bin/claude`,

    // User local bin (common for pip/pipx installs and manual installs).
    `${homeDir}/.local/bin/claude`,

    // npm global without nvm.
    `${homeDir}/.npm-global/bin/claude`,
    `${homeDir}/npm/bin/claude`,

    // Standard npm global.
    "/usr/local/bin/claude",

    // Homebrew on macOS.
    "/opt/homebrew/bin/claude",

    // Linux global.
    "/usr/bin/claude",
  ].filter((p): p is string => p !== null);

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
  } catch {
    // Ignore errors reading nvm directory.
  }

  // Check if any exist.
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        logger.info("ClaudeExecutable", "Found Claude executable", { path: p });
        return p;
      }
    } catch {
      // Ignore individual path check errors.
    }
  }

  // Log all paths we checked.
  logger.warn("ClaudeExecutable", "Could not find Claude executable", { checkedPaths: possiblePaths });
  return undefined;
}

/**
 * Find the Claude Code CLI executable path, throwing if not found.
 * Use this variant when Claude is required and its absence is an error.
 * @throws Error if Claude CLI is not found.
 */
export function requireClaudeExecutable(): string {
  const executable = findClaudeExecutable();
  if (!executable) {
    throw new Error("Claude Code CLI not found. Please install it with: npm install -g @anthropic-ai/claude-code");
  }
  return executable;
}
