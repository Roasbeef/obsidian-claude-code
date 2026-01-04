/**
 * Utility functions for formatting display values.
 * Extracted for testability.
 */

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
 */
export function generateTitle(content: string): string {
  const firstLine = content.split("\n")[0];
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return firstLine.slice(0, 47) + "...";
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
