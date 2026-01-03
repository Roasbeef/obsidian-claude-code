import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type ClaudeCodePlugin from "../main";
import { Conversation, ChatMessage } from "../types";
import { logger } from "../utils/Logger";

// Storage directory name within the vault.
const STORAGE_DIR = ".obsidian-claude-code";
const CONVERSATIONS_FILE = "conversations.json";
const HISTORY_DIR = "history";

// Stored conversation data.
interface StoredConversation extends Conversation {
  history: MessageParam[];
  displayMessages: ChatMessage[];
}

// Index of all conversations.
interface ConversationIndex {
  conversations: Conversation[];
  activeConversationId: string | null;
}

export class ConversationManager {
  private plugin: ClaudeCodePlugin;
  private index: ConversationIndex = {
    conversations: [],
    activeConversationId: null,
  };
  private currentConversation: StoredConversation | null = null;
  private initialized = false;

  constructor(plugin: ClaudeCodePlugin) {
    this.plugin = plugin;
  }

  // Initialize the storage directory.
  async initialize() {
    if (this.initialized) return;

    const vault = this.plugin.app.vault;

    // Create storage directory if it doesn't exist.
    try {
      const storageDir = vault.getAbstractFileByPath(STORAGE_DIR);
      if (!storageDir) {
        await vault.createFolder(STORAGE_DIR);
      }
    } catch (e) {
      // Folder may already exist, ignore error.
    }

    // Create history subdirectory.
    try {
      const historyDir = vault.getAbstractFileByPath(`${STORAGE_DIR}/${HISTORY_DIR}`);
      if (!historyDir) {
        await vault.createFolder(`${STORAGE_DIR}/${HISTORY_DIR}`);
      }
    } catch (e) {
      // Folder may already exist, ignore error.
    }

    // Load conversation index.
    await this.loadIndex();

    this.initialized = true;
  }

  // Load the conversation index.
  private async loadIndex() {
    const vault = this.plugin.app.vault;
    const indexPath = `${STORAGE_DIR}/${CONVERSATIONS_FILE}`;

    try {
      const file = vault.getAbstractFileByPath(indexPath);
      if (file) {
        const content = await vault.read(file as any);
        this.index = JSON.parse(content);
      }
    } catch (error) {
      console.error("Failed to load conversation index:", error);
      this.index = { conversations: [], activeConversationId: null };
    }
  }

  // Save the conversation index.
  private async saveIndex() {
    const vault = this.plugin.app.vault;
    const indexPath = `${STORAGE_DIR}/${CONVERSATIONS_FILE}`;

    const content = JSON.stringify(this.index, null, 2);

    // Always use adapter.write() to avoid race conditions with vault.create().
    try {
      await vault.adapter.write(indexPath, content);
    } catch (e) {
      logger.error("ConversationManager", "Failed to save index", { error: String(e) });
    }
  }

  // Create a new conversation.
  async createConversation(title?: string): Promise<Conversation> {
    await this.initialize();

    const id = this.generateId();
    const now = Date.now();

    const conversation: StoredConversation = {
      id,
      sessionId: id,
      title: title || `Conversation ${this.index.conversations.length + 1}`,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      metadata: {
        totalTokens: 0,
        totalCostUsd: 0,
      },
      history: [],
      displayMessages: [],
    };

    // Save the conversation.
    await this.saveConversation(conversation);

    // Add to index.
    this.index.conversations.unshift({
      id: conversation.id,
      sessionId: conversation.sessionId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messageCount,
      metadata: conversation.metadata,
    });
    this.index.activeConversationId = id;
    await this.saveIndex();

    this.currentConversation = conversation;
    return conversation;
  }

  // Load a conversation.
  async loadConversation(id: string): Promise<StoredConversation | null> {
    await this.initialize();

    const vault = this.plugin.app.vault;
    const path = `${STORAGE_DIR}/${HISTORY_DIR}/${id}.json`;

    try {
      const file = vault.getAbstractFileByPath(path);
      if (!file) return null;

      const content = await vault.read(file as any);
      const conversation = JSON.parse(content) as StoredConversation;
      this.currentConversation = conversation;
      this.index.activeConversationId = id;
      await this.saveIndex();
      return conversation;
    } catch (error) {
      console.error("Failed to load conversation:", error);
      return null;
    }
  }

  // Save the current conversation.
  private async saveConversation(conversation: StoredConversation) {
    const vault = this.plugin.app.vault;
    const path = `${STORAGE_DIR}/${HISTORY_DIR}/${conversation.id}.json`;

    const content = JSON.stringify(conversation, null, 2);

    // Always use adapter.write() to avoid race conditions with vault.create().
    try {
      await vault.adapter.write(path, content);
    } catch (e) {
      logger.error("ConversationManager", "Failed to save conversation", { error: String(e) });
    }
  }

  // Add a message to the current conversation.
  async addMessage(displayMessage: ChatMessage, historyEntry?: MessageParam) {
    logger.debug("ConversationManager", "addMessage called", { role: displayMessage.role, hasHistory: !!historyEntry });

    if (!this.currentConversation) {
      logger.debug("ConversationManager", "No current conversation, creating new one");
      await this.createConversation();
    }

    this.currentConversation!.displayMessages.push(displayMessage);
    if (historyEntry) {
      this.currentConversation!.history.push(historyEntry);
    }

    this.currentConversation!.messageCount++;
    this.currentConversation!.updatedAt = Date.now();

    // Auto-generate title from first user message.
    if (this.currentConversation!.messageCount === 1 && displayMessage.role === "user") {
      this.currentConversation!.title = this.generateTitle(displayMessage.content);
    }

    logger.debug("ConversationManager", "Saving conversation");
    await this.saveConversation(this.currentConversation!);
    await this.updateIndexEntry(this.currentConversation!);
    logger.debug("ConversationManager", "addMessage completed");
  }

  // Update usage metadata.
  async updateUsage(tokens: number, costUsd: number) {
    if (!this.currentConversation) return;

    this.currentConversation.metadata.totalTokens += tokens;
    this.currentConversation.metadata.totalCostUsd += costUsd;

    await this.saveConversation(this.currentConversation);
    await this.updateIndexEntry(this.currentConversation);
  }

  // Update the index entry for a conversation.
  private async updateIndexEntry(conversation: StoredConversation) {
    const index = this.index.conversations.findIndex((c) => c.id === conversation.id);
    if (index !== -1) {
      this.index.conversations[index] = {
        id: conversation.id,
        sessionId: conversation.sessionId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messageCount,
        metadata: conversation.metadata,
      };
      await this.saveIndex();
    }
  }

  // Delete a conversation.
  async deleteConversation(id: string) {
    await this.initialize();

    const vault = this.plugin.app.vault;
    const path = `${STORAGE_DIR}/${HISTORY_DIR}/${id}.json`;

    const file = vault.getAbstractFileByPath(path);
    if (file) {
      await vault.delete(file as any);
    }

    this.index.conversations = this.index.conversations.filter((c) => c.id !== id);
    if (this.index.activeConversationId === id) {
      this.index.activeConversationId = this.index.conversations[0]?.id || null;
    }
    await this.saveIndex();

    if (this.currentConversation?.id === id) {
      this.currentConversation = null;
    }
  }

  // Get all conversations.
  async getConversations(): Promise<Conversation[]> {
    await this.initialize();
    return this.index.conversations;
  }

  // Get the current conversation.
  getCurrentConversation(): StoredConversation | null {
    return this.currentConversation;
  }

  // Get the message history for the API.
  getHistory(): MessageParam[] {
    return this.currentConversation?.history || [];
  }

  // Get display messages for the UI.
  getDisplayMessages(): ChatMessage[] {
    return this.currentConversation?.displayMessages || [];
  }

  // Set the history (from AgentController).
  async setHistory(history: MessageParam[]) {
    if (this.currentConversation) {
      this.currentConversation.history = history;
      await this.saveConversation(this.currentConversation);
    }
  }

  // Update the session ID for the current conversation.
  async updateSessionId(sessionId: string) {
    if (this.currentConversation) {
      this.currentConversation.sessionId = sessionId;
      await this.saveConversation(this.currentConversation);
      await this.updateIndexEntry(this.currentConversation);
    }
  }

  // Clear current conversation.
  clearCurrent() {
    this.currentConversation = null;
  }

  // Generate a unique ID.
  private generateId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  // Generate a title from message content.
  private generateTitle(content: string): string {
    // Take first 50 chars of first line.
    const firstLine = content.split("\n")[0];
    if (firstLine.length <= 50) {
      return firstLine;
    }
    return firstLine.slice(0, 47) + "...";
  }
}
