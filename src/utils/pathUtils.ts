// Pure utility functions for vault path detection and processing.
// Extracted from MessageRenderer.ts for testability.

/**
 * File extensions commonly found in Obsidian vaults.
 */
export const VAULT_EXTENSIONS = [".md", ".txt", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".canvas"];

/**
 * Regex pattern to match file paths in text content.
 * Matches patterns like "pages/ark.md" or "journals/2025-07-29.md".
 */
export const FILE_PATH_PATTERN = /\b([a-zA-Z0-9_\-./]+\.(md|txt|pdf|png|jpg|jpeg|gif|svg|canvas))\b/g;

/**
 * Check if a string looks like a vault file path based on extension.
 * This is a pure function that doesn't require vault access.
 */
export function hasVaultExtension(text: string): boolean {
  const lowerText = text.toLowerCase();
  return VAULT_EXTENSIONS.some((ext) => lowerText.endsWith(ext));
}

/**
 * Check if a string looks like a relative path (contains / but no protocol).
 */
export function isRelativePath(text: string): boolean {
  return text.includes("/") && !text.includes("://") && !text.startsWith("http");
}

/**
 * Check if a string could be a vault path (has extension or is relative path).
 * This is the pure portion of MessageRenderer.isVaultPath().
 */
export function couldBeVaultPath(text: string): boolean {
  if (hasVaultExtension(text)) {
    return true;
  }
  return isRelativePath(text);
}

/**
 * Extract all potential file paths from a text string.
 * Returns an array of matches with their positions.
 */
export function extractFilePaths(text: string): Array<{ path: string; index: number; length: number }> {
  const results: Array<{ path: string; index: number; length: number }> = [];
  const pattern = new RegExp(FILE_PATH_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    results.push({
      path: match[1],
      index: match.index,
      length: match[0].length,
    });
  }

  return results;
}

/**
 * Normalize a file path for vault lookup.
 * Handles common variations like missing .md extension.
 */
export function normalizeVaultPath(path: string): string {
  // Trim whitespace.
  let normalized = path.trim();

  // Remove leading/trailing slashes.
  normalized = normalized.replace(/^\/+|\/+$/g, "");

  return normalized;
}

/**
 * Get the file name from a path.
 * Returns the last segment after the final slash.
 */
export function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Get the parent directory from a path.
 * Returns empty string if no parent.
 */
export function getParentPath(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

/**
 * Check if a path matches a search query (case-insensitive).
 * Matches against full path or just the filename.
 */
export function pathMatchesQuery(path: string, query: string): boolean {
  const lowerPath = path.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Match against full path.
  if (lowerPath.includes(lowerQuery)) {
    return true;
  }

  // Match against filename only.
  const fileName = getFileName(path).toLowerCase();
  return fileName.includes(lowerQuery);
}
