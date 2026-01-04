/**
 * Dependency injection interfaces for testability.
 *
 * These interfaces abstract away Obsidian-specific APIs and allow for
 * easy mocking in tests without requiring the full Obsidian runtime.
 */

export type { IVaultAdapter } from "./IVaultAdapter";
export type {
  IConversationStorage,
  StoredConversation,
  ConversationIndex,
} from "./IConversationStorage";
export type { ILogger, LogLevel } from "./ILogger";
export { createNoOpLogger, createConsoleLogger } from "./ILogger";
