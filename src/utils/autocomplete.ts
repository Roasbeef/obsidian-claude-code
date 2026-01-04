// Pure utility functions for autocomplete logic.
// Extracted from AutocompletePopup.ts for testability.

/**
 * Suggestion item for autocomplete.
 */
export interface Suggestion {
  type: "command" | "file";
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

/**
 * Built-in slash commands available in the chat input.
 */
export const SLASH_COMMANDS: Suggestion[] = [
  {
    type: "command",
    value: "/help",
    label: "/help",
    description: "Show available commands",
    icon: "help-circle",
  },
  {
    type: "command",
    value: "/clear",
    label: "/clear",
    description: "Clear conversation history",
    icon: "trash-2",
  },
  {
    type: "command",
    value: "/new",
    label: "/new",
    description: "Start a new conversation",
    icon: "plus",
  },
  {
    type: "command",
    value: "/file",
    label: "/file [path]",
    description: "Read a file into context",
    icon: "file-text",
  },
  {
    type: "command",
    value: "/search",
    label: "/search [query]",
    description: "Search vault for text",
    icon: "search",
  },
  {
    type: "command",
    value: "/context",
    label: "/context",
    description: "Show current context",
    icon: "info",
  },
];

/**
 * Filter slash commands based on a query string.
 * Matches against command value and description (case-insensitive).
 */
export function filterCommands(commands: Suggestion[], query: string): Suggestion[] {
  const q = query.toLowerCase();
  return commands.filter(
    (cmd) =>
      cmd.value.toLowerCase().includes(q) ||
      (cmd.description?.toLowerCase().includes(q) ?? false)
  );
}

/**
 * Calculate the next index in a circular list for keyboard navigation.
 * Handles ArrowDown navigation (forward).
 */
export function nextIndex(currentIndex: number, length: number): number {
  if (length === 0) return 0;
  return (currentIndex + 1) % length;
}

/**
 * Calculate the previous index in a circular list for keyboard navigation.
 * Handles ArrowUp navigation (backward).
 */
export function prevIndex(currentIndex: number, length: number): number {
  if (length === 0) return 0;
  return (currentIndex - 1 + length) % length;
}

/**
 * Check if input text starts with a slash command trigger.
 */
export function isCommandTrigger(text: string): boolean {
  return text.startsWith("/");
}

/**
 * Check if input contains an @ mention trigger at the cursor position.
 * Returns the position of the @ if found, or -1.
 */
export function findMentionTrigger(text: string, cursorPosition: number): number {
  const beforeCursor = text.slice(0, cursorPosition);
  const atIndex = beforeCursor.lastIndexOf("@");

  if (atIndex === -1) return -1;

  // Check if there's a space between @ and cursor.
  const afterAt = beforeCursor.slice(atIndex + 1);
  if (afterAt.includes(" ")) return -1;

  return atIndex;
}

/**
 * Extract the query text after a mention trigger.
 */
export function getMentionQuery(text: string, cursorPosition: number): string {
  const atIndex = findMentionTrigger(text, cursorPosition);
  if (atIndex === -1) return "";
  return text.slice(atIndex + 1, cursorPosition);
}

/**
 * Extract the query text for a command.
 * Assumes text starts with "/".
 */
export function getCommandQuery(text: string, cursorPosition: number): string {
  if (!isCommandTrigger(text)) return "";
  return text.slice(1, cursorPosition);
}

/**
 * Build a file mention string for insertion.
 */
export function buildFileMention(path: string): string {
  return `@[[${path}]]`;
}

/**
 * Replace the mention trigger with a file mention in the input.
 */
export function replaceMentionWithFile(
  text: string,
  cursorPosition: number,
  filePath: string
): { newText: string; newCursorPosition: number } {
  const atIndex = findMentionTrigger(text, cursorPosition);

  if (atIndex === -1) {
    // No @ found, just append.
    const mention = buildFileMention(filePath);
    return {
      newText: text + mention,
      newCursorPosition: text.length + mention.length,
    };
  }

  // Replace from @ to cursor with the file mention.
  const mention = buildFileMention(filePath);
  const newText = text.slice(0, atIndex) + mention + text.slice(cursorPosition);
  const newCursorPosition = atIndex + mention.length;

  return { newText, newCursorPosition };
}

/**
 * Build the full message content including file contexts.
 */
export function buildMessageWithContexts(message: string, fileContexts: string[]): string {
  if (fileContexts.length === 0) {
    return message;
  }

  const contextPrefix = fileContexts.map((f) => buildFileMention(f)).join(" ");
  return `${contextPrefix}\n\n${message}`;
}
