/**
 * Utility functions for formatting display values.
 * Extracted for testability.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "./Logger";

/**
 * Format a duration in milliseconds to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generate a title from content (first line, truncated to 50 chars).
 * This is the fallback method when Haiku title generation is not available or fails.
 */
export function generateTitle(content: string): string {
  const firstLine = content.split("\n")[0];
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return firstLine.slice(0, 47) + "...";
}

/**
 * Generate a conversation title using Claude Haiku based on the conversation content.
 * @param userMessage The first user message content
 * @param assistantMessage The first assistant response content
 * @param apiKey The Anthropic API key (from settings or env)
 * @param claudeExecutable Path to the Claude CLI executable
 * @returns A promise that resolves to a concise title, or null if generation fails
 */
export async function generateTitleWithHaiku(
  userMessage: string,
  assistantMessage: string,
  apiKey?: string,
  claudeExecutable?: string
): Promise<string | null> {
  try {
    // Get API key from parameter or environment
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      logger.debug("TitleGeneration", "No API key available for Haiku title generation");
      return null;
    }

    // Build environment with API key
    const env: Record<string, string | undefined> = { ...process.env };
    env.ANTHROPIC_API_KEY = key;

    // Add claude executable path to PATH if provided
    if (claudeExecutable) {
      const path = require("path");
      const claudeDir = path.dirname(claudeExecutable);
      if (env.PATH && !env.PATH.includes(claudeDir)) {
        env.PATH = `${claudeDir}:${env.PATH}`;
      } else if (!env.PATH) {
        env.PATH = claudeDir;
      }
    }

    // Limit messages to avoid excessive tokens
    const userPreview = userMessage.slice(0, 500);
    const assistantPreview = assistantMessage.slice(0, 500);
    
    // Create a simple prompt for title generation
    const titlePrompt = `Generate a concise title (max 50 characters) for this conversation. Reply with ONLY the title:

User: ${userPreview}
Assistant: ${assistantPreview}`;

    logger.debug("TitleGeneration", "Calling Haiku for title generation");

    let generatedTitle = "";

    // Use the Agent SDK query function with Haiku model
    for await (const message of query({
      prompt: titlePrompt,
      options: {
        env,
        pathToClaudeCodeExecutable: claudeExecutable,
        model: "haiku",
        // Minimal settings for quick title generation
        maxBudgetUsd: 0.05, // Very low budget for just a title
        // No tools needed for title generation
        tools: { type: "preset", preset: "none" },
        systemPrompt: { type: "none" },
      },
    })) {
      // Extract text from assistant messages
      if (message.type === "assistant") {
        const content = message.message.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") {
              generatedTitle += block.text;
            }
          }
        }
      } else if (message.type === "result" && message.subtype === "success") {
        // Query completed successfully
        break;
      } else if (message.type === "result") {
        // Query failed
        logger.warn("TitleGeneration", "Haiku query failed", { subtype: message.subtype });
        return null;
      }
    }

    // Clean up and validate the title
    const title = generatedTitle.trim();
    if (!title) {
      logger.debug("TitleGeneration", "Haiku returned empty title");
      return null;
    }

    // Ensure it's not too long
    const finalTitle = title.length <= 50 ? title : title.slice(0, 47) + "...";
    
    logger.debug("TitleGeneration", "Generated title with Haiku", { title: finalTitle });
    return finalTitle;

  } catch (error) {
    logger.warn("TitleGeneration", "Failed to generate title with Haiku", { error: String(error) });
    return null;
  }
}

/**
 * Generate a unique ID with prefix.
 */
export function generateId(prefix: string = "id"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Extract filename from a path.
 */
export function getFilename(path: string): string {
  return path.split("/").pop() || "";
}
