import { setIcon } from "obsidian";
import type ClaudeCodePlugin from "../main";
import { AutocompletePopup } from "./AutocompletePopup";
import { logger } from "../utils/Logger";

interface ChatInputOptions {
  onSend: (message: string) => void;
  onCancel: () => void;
  isStreaming: () => boolean;
  getQueueLength?: () => number;  // Get number of queued messages.
  onCommand?: (command: string) => void;
  plugin: ClaudeCodePlugin;
}

export class ChatInput {
  private containerEl: HTMLElement;
  private textareaEl!: HTMLTextAreaElement;
  private sendButtonEl!: HTMLButtonElement;
  private options: ChatInputOptions;
  private fileContexts: string[] = [];
  private autocomplete: AutocompletePopup;
  private isSending = false;  // Guard against double-send.

  constructor(parentEl: HTMLElement, options: ChatInputOptions) {
    this.containerEl = parentEl;
    this.options = options;

    // Create autocomplete popup.
    this.autocomplete = new AutocompletePopup(options.plugin, (suggestion) => {
      if (suggestion.type === "command") {
        this.handleCommand(suggestion.value);
      } else {
        this.insertFileMention(suggestion.value);
      }
    });

    this.render();
  }

  private render() {
    // Quick actions bar.
    const quickActionsEl = this.containerEl.createDiv({ cls: "claude-code-quick-actions" });

    const addFileButton = quickActionsEl.createEl("button", { cls: "claude-code-quick-action" });
    addFileButton.setText("+File");
    addFileButton.addEventListener("click", () => this.handleAddFile());

    const mentionButton = quickActionsEl.createEl("button", { cls: "claude-code-quick-action" });
    mentionButton.setText("@mention");
    mentionButton.addEventListener("click", () => {
      this.insertAtCursor("@");
      this.showAutocomplete("file");
    });

    const commandButton = quickActionsEl.createEl("button", { cls: "claude-code-quick-action" });
    commandButton.setText("/command");
    commandButton.addEventListener("click", () => {
      this.textareaEl.value = "/";
      this.textareaEl.focus();
      this.showAutocomplete("command");
    });

    // Input wrapper.
    const wrapperEl = this.containerEl.createDiv({ cls: "claude-code-input-wrapper" });

    // Textarea.
    this.textareaEl = wrapperEl.createEl("textarea", {
      cls: "claude-code-input",
      attr: {
        placeholder: "Ask about your vault...",
        rows: "1",
      },
    });

    // Auto-resize textarea.
    this.textareaEl.addEventListener("input", () => {
      this.autoResize();
      this.checkForAutocomplete();
    });

    // Handle keyboard shortcuts.
    this.textareaEl.addEventListener("keydown", (e) => this.handleKeydown(e));

    // Hide autocomplete on blur.
    this.textareaEl.addEventListener("blur", () => {
      // Delay to allow click on autocomplete item.
      setTimeout(() => this.autocomplete.hide(), 200);
    });

    // Send button.
    this.sendButtonEl = wrapperEl.createEl("button", { cls: "claude-code-send-button" });
    setIcon(this.sendButtonEl, "send");
    this.sendButtonEl.addEventListener("click", () => this.handleSend());
  }

  private handleKeydown(e: KeyboardEvent) {
    logger.debug("ChatInput", "Keydown event", { key: e.key, shiftKey: e.shiftKey });

    // Let autocomplete handle navigation keys.
    if (this.autocomplete.isVisible() && this.autocomplete.handleKeydown(e)) {
      return;
    }

    // Send on Enter (without Shift). Can queue messages while streaming.
    if (e.key === "Enter" && !e.shiftKey) {
      logger.info("ChatInput", "Enter pressed, calling handleSend", { isStreaming: this.options.isStreaming() });
      e.preventDefault();
      // Always allow sending - will be queued if streaming.
      this.handleSend();
      return;
    }

    // Cancel on Escape.
    if (e.key === "Escape") {
      if (this.autocomplete.isVisible()) {
        e.preventDefault();
        this.autocomplete.hide();
      } else if (this.options.isStreaming()) {
        e.preventDefault();
        this.options.onCancel();
      }
      return;
    }
  }

  private checkForAutocomplete() {
    const value = this.textareaEl.value;
    const cursorPos = this.textareaEl.selectionStart;

    // Check for slash command at start.
    if (value.startsWith("/")) {
      const query = value.slice(1, cursorPos);
      this.showAutocomplete("command", query);
      return;
    }

    // Check for @ mention.
    const beforeCursor = value.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");
    if (atIndex !== -1) {
      const afterAt = beforeCursor.slice(atIndex + 1);
      // Only show if there's no space after @.
      if (!afterAt.includes(" ")) {
        this.showAutocomplete("file", afterAt);
        return;
      }
    }

    this.autocomplete.hide();
  }

  private showAutocomplete(type: "command" | "file", query = "") {
    this.autocomplete.show(this.textareaEl, type, query);
  }

  private handleCommand(command: string) {
    switch (command) {
      case "/help":
        this.textareaEl.value = "What commands and tools do you have available?";
        break;
      case "/clear":
        this.options.onCommand?.("clear");
        this.textareaEl.value = "";
        break;
      case "/new":
        this.options.onCommand?.("new");
        this.textareaEl.value = "";
        break;
      case "/file":
        this.handleAddFile();
        this.textareaEl.value = "";
        break;
      case "/search":
        this.textareaEl.value = "Search the vault for: ";
        break;
      case "/context":
        this.textareaEl.value = "Show me the current context and files being used.";
        break;
      default:
        this.textareaEl.value = command + " ";
    }
    this.textareaEl.focus();
  }

  private insertFileMention(path: string) {
    const value = this.textareaEl.value;
    const cursorPos = this.textareaEl.selectionStart;

    // Find the @ that triggered this.
    const beforeCursor = value.slice(0, cursorPos);
    const atIndex = beforeCursor.lastIndexOf("@");

    if (atIndex !== -1) {
      // Replace from @ to cursor with the file mention.
      const newValue = value.slice(0, atIndex) + `@[[${path}]]` + value.slice(cursorPos);
      this.textareaEl.value = newValue;
      this.textareaEl.selectionStart = this.textareaEl.selectionEnd = atIndex + path.length + 5;
    } else {
      // Just append.
      this.insertAtCursor(`@[[${path}]]`);
    }

    this.textareaEl.focus();
  }

  private handleSend() {
    logger.info("ChatInput", "handleSend called");

    // Guard against double-send (e.g., rapid Enter key or click+Enter race).
    if (this.isSending) {
      logger.warn("ChatInput", "Already sending, ignoring duplicate");
      return;
    }

    const message = this.textareaEl.value.trim();
    logger.debug("ChatInput", "Message content", { length: message.length, preview: message.slice(0, 50) });

    if (!message) {
      logger.warn("ChatInput", "Empty message, not sending");
      return;
    }

    this.isSending = true;

    // Include file contexts in message if any.
    let fullMessage = message;
    if (this.fileContexts.length > 0) {
      const contextPrefix = this.fileContexts.map((f) => `@[[${f}]]`).join(" ");
      fullMessage = `${contextPrefix}\n\n${message}`;
      this.fileContexts = [];
      this.updateContextChips();
    }

    logger.info("ChatInput", "Calling onSend callback", { fullMessageLength: fullMessage.length });
    this.options.onSend(fullMessage);
    this.textareaEl.value = "";
    this.autoResize();
    this.autocomplete.hide();

    // Reset guard after a short delay to allow for next message.
    setTimeout(() => {
      this.isSending = false;
    }, 100);

    logger.info("ChatInput", "handleSend completed");
  }

  private handleAddFile() {
    const activeFile = this.options.plugin.app.workspace.getActiveFile();
    if (activeFile) {
      this.addFileContext(activeFile.path);
    }
  }

  addFileContext(path: string) {
    if (!this.fileContexts.includes(path)) {
      this.fileContexts.push(path);
      this.updateContextChips();
    }
  }

  private updateContextChips() {
    // Remove existing chips.
    const existingChips = this.containerEl.querySelector(".claude-code-context-chips");
    if (existingChips) {
      existingChips.remove();
    }

    if (this.fileContexts.length === 0) return;

    // Add context chips before quick actions.
    const chipsEl = this.containerEl.createDiv({ cls: "claude-code-context-chips" });
    this.containerEl.insertBefore(chipsEl, this.containerEl.firstChild);

    for (const path of this.fileContexts) {
      const chipEl = chipsEl.createDiv({ cls: "claude-code-context-chip" });
      chipEl.createSpan({ text: path.split("/").pop() || path });

      const removeBtn = chipEl.createSpan({ cls: "claude-code-context-chip-remove" });
      setIcon(removeBtn, "x");
      removeBtn.addEventListener("click", () => {
        this.fileContexts = this.fileContexts.filter((f) => f !== path);
        this.updateContextChips();
      });
    }
  }

  private insertAtCursor(text: string) {
    const start = this.textareaEl.selectionStart;
    const end = this.textareaEl.selectionEnd;
    const value = this.textareaEl.value;
    this.textareaEl.value = value.slice(0, start) + text + value.slice(end);
    this.textareaEl.selectionStart = this.textareaEl.selectionEnd = start + text.length;
    this.textareaEl.focus();
  }

  private autoResize() {
    this.textareaEl.style.height = "auto";
    this.textareaEl.style.height = Math.min(this.textareaEl.scrollHeight, 200) + "px";
  }

  updateState() {
    const streaming = this.options.isStreaming();
    const queueLength = this.options.getQueueLength?.() ?? 0;

    // Always allow sending - messages will be queued while streaming.
    this.sendButtonEl.disabled = false;

    if (streaming) {
      // Show queue-aware icon and placeholder.
      setIcon(this.sendButtonEl, "plus-circle");  // Indicates "add to queue".
      if (queueLength > 0) {
        this.textareaEl.placeholder = `${queueLength} message${queueLength > 1 ? "s" : ""} queued. Type to add more...`;
      } else {
        this.textareaEl.placeholder = "Type to queue message while Claude works...";
      }
    } else {
      setIcon(this.sendButtonEl, "send");
      this.textareaEl.placeholder = "Ask about your vault...";
    }
  }

  focus() {
    this.textareaEl.focus();
  }

  getValue(): string {
    return this.textareaEl.value;
  }

  setValue(value: string) {
    this.textareaEl.value = value;
    this.autoResize();
  }
}
