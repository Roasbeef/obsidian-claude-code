import { setIcon } from "obsidian";
import type ClaudeCodePlugin from "../main";
import {
  SLASH_COMMANDS,
  filterCommands,
  nextIndex,
  prevIndex,
  type Suggestion,
} from "../utils/autocomplete";

export class AutocompletePopup {
  private plugin: ClaudeCodePlugin;
  private containerEl: HTMLElement | null = null;
  private suggestions: Suggestion[] = [];
  private selectedIndex = 0;
  private onSelect: (suggestion: Suggestion) => void;
  private visible = false;

  constructor(plugin: ClaudeCodePlugin, onSelect: (suggestion: Suggestion) => void) {
    this.plugin = plugin;
    this.onSelect = onSelect;
  }

  // Show the popup with suggestions.
  show(
    anchorEl: HTMLElement,
    type: "command" | "file",
    query: string
  ) {
    this.suggestions = this.getSuggestions(type, query);
    if (this.suggestions.length === 0) {
      this.hide();
      return;
    }

    this.selectedIndex = 0;
    this.visible = true;
    this.render(anchorEl);
  }

  // Hide the popup.
  hide() {
    if (this.containerEl) {
      this.containerEl.remove();
      this.containerEl = null;
    }
    this.visible = false;
  }

  // Check if visible.
  isVisible(): boolean {
    return this.visible;
  }

  // Handle keyboard navigation.
  handleKeydown(e: KeyboardEvent): boolean {
    if (!this.visible) return false;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.selectedIndex = nextIndex(this.selectedIndex, this.suggestions.length);
        this.updateSelection();
        return true;

      case "ArrowUp":
        e.preventDefault();
        this.selectedIndex = prevIndex(this.selectedIndex, this.suggestions.length);
        this.updateSelection();
        return true;

      case "Enter":
      case "Tab":
        e.preventDefault();
        this.selectCurrent();
        return true;

      case "Escape":
        e.preventDefault();
        this.hide();
        return true;
    }

    return false;
  }

  // Get suggestions based on type and query.
  private getSuggestions(type: "command" | "file", query: string): Suggestion[] {
    if (type === "command") {
      return this.getCommandSuggestions(query);
    } else {
      return this.getFileSuggestions(query);
    }
  }

  // Get matching slash commands.
  private getCommandSuggestions(query: string): Suggestion[] {
    return filterCommands(SLASH_COMMANDS, query);
  }

  // Get matching files from vault.
  private getFileSuggestions(query: string): Suggestion[] {
    const q = query.toLowerCase();
    const files = this.plugin.app.vault.getMarkdownFiles();

    return files
      .filter((f) => f.path.toLowerCase().includes(q) || f.basename.toLowerCase().includes(q))
      .slice(0, 10)
      .map((f) => ({
        type: "file" as const,
        value: f.path,
        label: f.basename,
        description: f.parent?.path || "",
        icon: "file-text",
      }));
  }

  // Render the popup.
  private render(anchorEl: HTMLElement) {
    this.hide();

    this.containerEl = document.createElement("div");
    this.containerEl.addClass("claude-code-autocomplete");

    // Position below the anchor element.
    const rect = anchorEl.getBoundingClientRect();
    this.containerEl.style.position = "fixed";
    this.containerEl.style.left = `${rect.left}px`;
    this.containerEl.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    this.containerEl.style.maxHeight = "200px";
    this.containerEl.style.overflowY = "auto";
    this.containerEl.style.zIndex = "1000";

    // Render suggestions.
    for (let i = 0; i < this.suggestions.length; i++) {
      const suggestion = this.suggestions[i];
      const itemEl = this.containerEl.createDiv({
        cls: `claude-code-autocomplete-item ${i === this.selectedIndex ? "selected" : ""}`,
      });

      // Icon.
      if (suggestion.icon) {
        const iconEl = itemEl.createSpan({ cls: "claude-code-autocomplete-icon" });
        setIcon(iconEl, suggestion.icon);
      }

      // Content.
      const contentEl = itemEl.createDiv({ cls: "claude-code-autocomplete-content" });
      contentEl.createDiv({ cls: "claude-code-autocomplete-label", text: suggestion.label });
      if (suggestion.description) {
        contentEl.createDiv({ cls: "claude-code-autocomplete-desc", text: suggestion.description });
      }

      // Click handler.
      itemEl.addEventListener("click", () => {
        this.selectedIndex = i;
        this.selectCurrent();
      });

      itemEl.addEventListener("mouseenter", () => {
        this.selectedIndex = i;
        this.updateSelection();
      });
    }

    document.body.appendChild(this.containerEl);
  }

  // Update selection highlighting.
  private updateSelection() {
    if (!this.containerEl) return;

    const items = this.containerEl.querySelectorAll(".claude-code-autocomplete-item");
    items.forEach((item, i) => {
      item.toggleClass("selected", i === this.selectedIndex);
    });
  }

  // Select current suggestion.
  private selectCurrent() {
    const suggestion = this.suggestions[this.selectedIndex];
    if (suggestion) {
      this.onSelect(suggestion);
    }
    this.hide();
  }
}
