import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import { CHAT_VIEW_TYPE, ChatMessage, ToolCall } from "../types";
import type ClaudeCodePlugin from "../main";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { AgentController } from "../agent/AgentController";
import { ConversationManager } from "../agent/ConversationManager";
import { ConversationHistoryModal } from "./ConversationHistoryModal";
import { logger } from "../utils/Logger";

export class ChatView extends ItemView {
  plugin: ClaudeCodePlugin;
  private headerEl!: HTMLElement;
  private messagesContainerEl!: HTMLElement;
  private inputContainerEl!: HTMLElement;
  private messageList!: MessageList;
  private chatInput!: ChatInput;
  private messages: ChatMessage[] = [];
  private isStreaming = false;
  private agentController: AgentController;
  private conversationManager: ConversationManager;
  private streamingMessageId: string | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: ClaudeCodePlugin) {
    super(leaf);
    this.plugin = plugin;
    this.agentController = new AgentController(plugin);
    this.conversationManager = new ConversationManager(plugin);
    this.setupAgentEvents();
  }

  private setupAgentEvents() {
    this.agentController.setEventHandlers({
      onMessage: (message) => this.handleStreamingMessage(message),
      onToolCall: (toolCall) => this.handleToolCall(toolCall),
      onToolResult: (id, result, isError) => this.handleToolResult(id, result, isError),
      onStreamingStart: () => this.handleStreamingStart(),
      onStreamingEnd: () => this.handleStreamingEnd(),
      onError: (error) => this.handleError(error),

      // Subagent lifecycle events.
      onSubagentStart: (toolCallId, subagentType, subagentId) =>
        this.handleSubagentStart(toolCallId, subagentType, subagentId),
      onSubagentStop: (toolCallId, success, error) =>
        this.handleSubagentStop(toolCallId, success, error),
    });
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Claude Code";
  }

  getIcon(): string {
    return "message-square";
  }

  async onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("claude-code-view");

    // Initialize conversation manager.
    await this.conversationManager.initialize();

    // Load last conversation if any.
    const conversations = await this.conversationManager.getConversations();
    if (conversations.length > 0 && this.conversationManager.getCurrentConversation()) {
      this.messages = this.conversationManager.getDisplayMessages();
      // Restore session ID if available.
      const currentConv = this.conversationManager.getCurrentConversation();
      if (currentConv?.sessionId) {
        this.agentController.setSessionId(currentConv.sessionId);
      }
    }

    this.renderView();
  }

  async onClose() {
    // Cancel any streaming.
    this.agentController.cancelStream();
  }

  private renderView() {
    // Check if API key is configured.
    if (!this.plugin.isApiKeyConfigured()) {
      this.renderSetupNotice();
      return;
    }

    this.renderHeader();
    this.renderMessagesArea();
    this.renderInputArea();
  }

  private renderSetupNotice() {
    const noticeEl = this.contentEl.createDiv({ cls: "claude-code-setup-notice" });

    const titleEl = noticeEl.createDiv({ cls: "claude-code-setup-notice-title" });
    titleEl.setText("API Key Required");

    const descEl = noticeEl.createDiv();
    descEl.setText("Please configure your Anthropic API key in settings to start chatting with Claude.");

    const buttonEl = noticeEl.createEl("button", { cls: "mod-cta" });
    buttonEl.setText("Open Settings");
    buttonEl.addEventListener("click", () => {
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("obsidian-claude-code");
    });
  }

  private renderHeader() {
    this.headerEl = this.contentEl.createDiv({ cls: "claude-code-header" });

    // Title section.
    const titleEl = this.headerEl.createDiv({ cls: "claude-code-header-title" });
    const iconEl = titleEl.createSpan();
    setIcon(iconEl, "bot");
    titleEl.createSpan({ text: "Claude Code" });

    // Actions section.
    const actionsEl = this.headerEl.createDiv({ cls: "claude-code-header-actions" });

    // New conversation button.
    const newButton = actionsEl.createEl("button", { attr: { "aria-label": "New Conversation" } });
    setIcon(newButton, "plus");
    newButton.addEventListener("click", () => this.startNewConversation());

    // History button.
    const historyButton = actionsEl.createEl("button", { attr: { "aria-label": "History" } });
    setIcon(historyButton, "history");
    historyButton.addEventListener("click", () => this.showHistory());

    // Settings button.
    const settingsButton = actionsEl.createEl("button", { attr: { "aria-label": "Settings" } });
    setIcon(settingsButton, "settings");
    settingsButton.addEventListener("click", () => {
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("obsidian-claude-code");
    });
  }

  private renderMessagesArea() {
    this.messagesContainerEl = this.contentEl.createDiv({ cls: "claude-code-messages" });
    this.messageList = new MessageList(this.messagesContainerEl, this.plugin);

    if (this.messages.length === 0) {
      this.renderEmptyState();
    } else {
      this.messageList.render(this.messages);
      this.scrollToBottom();
    }
  }

  private renderEmptyState() {
    const emptyEl = this.messagesContainerEl.createDiv({ cls: "claude-code-empty-state" });

    const iconEl = emptyEl.createDiv({ cls: "claude-code-empty-state-icon" });
    setIcon(iconEl, "message-square");

    const titleEl = emptyEl.createDiv({ cls: "claude-code-empty-state-title" });
    titleEl.setText("Start a conversation");

    const descEl = emptyEl.createDiv({ cls: "claude-code-empty-state-description" });
    descEl.setText("Ask Claude about your vault, get help with notes, or automate tasks. Use @ to mention files.");
  }

  private renderInputArea() {
    this.inputContainerEl = this.contentEl.createDiv({ cls: "claude-code-input-container" });
    this.chatInput = new ChatInput(this.inputContainerEl, {
      onSend: (message) => this.handleSendMessage(message),
      onCancel: () => this.handleCancelStreaming(),
      isStreaming: () => this.isStreaming,
      plugin: this.plugin,
    });
  }

  private async handleSendMessage(content: string) {
    logger.info("ChatView", "handleSendMessage called", { contentLength: content.length, preview: content.slice(0, 50) });

    if (!content.trim() || this.isStreaming) {
      logger.warn("ChatView", "Early return from handleSendMessage", { empty: !content.trim(), isStreaming: this.isStreaming });
      return;
    }

    // Add user message to UI.
    const userMessage: ChatMessage = {
      id: this.generateId(),
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
    };
    this.messages.push(userMessage);
    logger.debug("ChatView", "User message created", { id: userMessage.id });

    // Save to conversation.
    try {
      logger.debug("ChatView", "Saving to conversation manager");
      await this.conversationManager.addMessage(userMessage, {
        role: "user",
        content: content.trim(),
      });
      logger.debug("ChatView", "Conversation saved");
    } catch (e) {
      logger.error("ChatView", "Failed to save to conversation", { error: String(e) });
    }

    // Clear empty state and render.
    logger.debug("ChatView", "Rendering messages");
    this.messagesContainerEl.empty();
    this.messageList = new MessageList(this.messagesContainerEl, this.plugin);
    this.messageList.render(this.messages);
    this.scrollToBottom();

    // Start streaming.
    this.isStreaming = true;
    this.chatInput.updateState();

    // Immediately show a "thinking" placeholder message for instant feedback.
    const placeholderId = this.generateId();
    const placeholderMessage: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    this.messages.push(placeholderMessage);
    this.streamingMessageId = placeholderId;
    this.messageList.render(this.messages);
    this.scrollToBottom();

    logger.info("ChatView", "Calling agentController.sendMessage");
    try {
      // Send to agent and get response.
      const response = await this.agentController.sendMessage(content.trim());

      // Update the streaming message with final content.
      const streamingIndex = this.messages.findIndex((m) => m.id === this.streamingMessageId);
      if (streamingIndex !== -1) {
        this.messages[streamingIndex] = response;
      } else {
        this.messages.push(response);
      }

      // Save to conversation with session ID.
      await this.conversationManager.addMessage(response);
      const sessionId = this.agentController.getSessionId();
      if (sessionId) {
        await this.conversationManager.updateSessionId(sessionId);
      }

      this.messageList.render(this.messages);
      this.scrollToBottom();
    } catch (error) {
      logger.error("ChatView", "Error sending message", { error: String(error), name: (error as Error).name });
      if ((error as Error).name !== "AbortError") {
        console.error("Error sending message:", error);
        this.showError(error instanceof Error ? error.message : "Unknown error");
      }
    } finally {
      logger.info("ChatView", "handleSendMessage completed");
      this.isStreaming = false;
      this.streamingMessageId = null;
      this.chatInput.updateState();
    }
  }

  private handleStreamingMessage(message: ChatMessage) {
    // Update or add streaming message.
    if (this.streamingMessageId) {
      const index = this.messages.findIndex((m) => m.id === this.streamingMessageId);
      if (index !== -1) {
        this.messages[index] = { ...message, id: this.streamingMessageId };
      }
    } else {
      this.streamingMessageId = message.id;
      this.messages.push(message);
    }

    this.messageList.render(this.messages);
    this.scrollToBottom();
  }

  private handleToolCall(toolCall: ToolCall) {
    // Add tool call to current streaming message.
    if (this.streamingMessageId) {
      const index = this.messages.findIndex((m) => m.id === this.streamingMessageId);
      if (index !== -1) {
        if (!this.messages[index].toolCalls) {
          this.messages[index].toolCalls = [];
        }
        this.messages[index].toolCalls!.push(toolCall);
        this.messageList.render(this.messages);
        this.scrollToBottom();
      }
    }
  }

  private handleToolResult(toolCallId: string, result: string, isError: boolean) {
    // Update tool call status.
    if (this.streamingMessageId) {
      const index = this.messages.findIndex((m) => m.id === this.streamingMessageId);
      if (index !== -1 && this.messages[index].toolCalls) {
        const toolCall = this.messages[index].toolCalls!.find((t) => t.id === toolCallId);
        if (toolCall) {
          toolCall.output = result;
          toolCall.status = isError ? "error" : "success";
          toolCall.endTime = Date.now();
          if (isError) {
            toolCall.error = result;
          }
          this.messageList.render(this.messages);
        }
      }
    }
  }

  private handleSubagentStart(toolCallId: string, subagentType: string, subagentId: string) {
    logger.debug("ChatView", "Subagent started", { toolCallId, subagentType, subagentId });

    // Find the message containing this tool call.
    const message = this.findMessageWithToolCall(toolCallId);
    if (message) {
      const toolCall = message.toolCalls?.find((tc) => tc.id === toolCallId);
      if (toolCall) {
        toolCall.subagentStatus = "running";
        toolCall.subagentId = subagentId;
        if (toolCall.subagentProgress) {
          toolCall.subagentProgress.message = `${subagentType} agent running...`;
          toolCall.subagentProgress.lastUpdate = Date.now();
        }
        this.messageList.render(this.messages);
        this.scrollToBottom();
      }
    }
  }

  private handleSubagentStop(toolCallId: string, success: boolean, error?: string) {
    logger.debug("ChatView", "Subagent stopped", { toolCallId, success, error });

    // Find the message containing this tool call.
    const message = this.findMessageWithToolCall(toolCallId);
    if (message) {
      const toolCall = message.toolCalls?.find((tc) => tc.id === toolCallId);
      if (toolCall) {
        toolCall.subagentStatus = success ? "completed" : "error";
        if (error) {
          toolCall.error = error;
        }
        if (toolCall.subagentProgress) {
          toolCall.subagentProgress.message = success ? "Completed" : `Error: ${error || "Unknown error"}`;
          toolCall.subagentProgress.lastUpdate = Date.now();
        }
        this.messageList.render(this.messages);
      }
    }
  }

  private findMessageWithToolCall(toolCallId: string): ChatMessage | undefined {
    for (const message of this.messages) {
      if (message.toolCalls?.some((tc) => tc.id === toolCallId)) {
        return message;
      }
    }
    return undefined;
  }

  private handleStreamingStart() {
    this.isStreaming = true;
    this.chatInput.updateState();
  }

  private handleStreamingEnd() {
    this.isStreaming = false;
    this.chatInput.updateState();
  }

  private handleError(error: Error) {
    this.showError(error.message);
  }

  private handleCancelStreaming() {
    this.agentController.cancelStream();
    this.isStreaming = false;
    this.streamingMessageId = null;
    this.chatInput.updateState();
  }

  private showError(message: string) {
    const errorEl = this.messagesContainerEl.createDiv({ cls: "claude-code-error" });
    errorEl.setText(`Error: ${message}`);
    this.scrollToBottom();
  }

  async startNewConversation() {
    // Cancel any streaming.
    this.agentController.cancelStream();

    // Clear state.
    this.messages = [];
    this.agentController.clearHistory();
    this.conversationManager.clearCurrent();

    // Create new conversation.
    await this.conversationManager.createConversation();

    // Re-render.
    this.messagesContainerEl.empty();
    this.renderEmptyState();

    this.isStreaming = false;
    this.streamingMessageId = null;
    this.chatInput.updateState();
  }

  private async showHistory() {
    const modal = new ConversationHistoryModal(
      this.app,
      this.conversationManager,
      async (id) => {
        // Load selected conversation.
        const conv = await this.conversationManager.loadConversation(id);
        if (conv) {
          this.messages = this.conversationManager.getDisplayMessages();
          // Set the session ID for resumption (SDK handles history internally).
          if (conv.sessionId) {
            this.agentController.setSessionId(conv.sessionId);
          }
          this.messagesContainerEl.empty();
          this.messageList = new MessageList(this.messagesContainerEl, this.plugin);
          if (this.messages.length === 0) {
            this.renderEmptyState();
          } else {
            this.messageList.render(this.messages);
            this.scrollToBottom();
          }
        }
      },
      async (id) => {
        // Delete conversation.
        await this.conversationManager.deleteConversation(id);
      }
    );
    modal.open();
  }

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  addCurrentFileContext() {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      this.chatInput.addFileContext(activeFile.path);
    }
  }

  scrollToBottom() {
    this.messagesContainerEl.scrollTop = this.messagesContainerEl.scrollHeight;
  }
}
