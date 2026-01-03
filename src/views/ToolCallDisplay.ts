import { setIcon } from "obsidian";
import { ToolCall } from "../types";

export class ToolCallDisplay {
  private containerEl: HTMLElement;
  private toolCall: ToolCall;
  private isExpanded = false;
  private contentEl: HTMLElement | null = null;

  constructor(containerEl: HTMLElement, toolCall: ToolCall) {
    this.containerEl = containerEl;
    this.toolCall = toolCall;
  }

  render() {
    this.containerEl.empty();
    this.containerEl.addClass("claude-code-tool-call");

    // Add subagent-specific class for special styling.
    if (this.toolCall.isSubagent) {
      this.containerEl.addClass("subagent-task");
    } else {
      this.containerEl.removeClass("subagent-task");
    }

    // Handle collapsed/expanded state - must explicitly add/remove class.
    if (this.isExpanded) {
      this.containerEl.removeClass("collapsed");
    } else {
      this.containerEl.addClass("collapsed");
    }

    // Header (clickable to expand/collapse).
    const headerEl = this.containerEl.createDiv({ cls: "claude-code-tool-call-header" });
    headerEl.addEventListener("click", () => this.toggle());

    // Expand/collapse icon.
    const expandIcon = headerEl.createSpan({ cls: "claude-code-tool-call-icon" });
    setIcon(expandIcon, this.isExpanded ? "chevron-down" : "chevron-right");

    // Tool name (with special handling for Skill/Task tools).
    const nameEl = headerEl.createSpan({ cls: "claude-code-tool-call-name" });
    nameEl.setText(this.getDisplayName());

    // Brief description of input.
    const descEl = headerEl.createSpan({ cls: "claude-code-tool-call-desc" });
    descEl.setText(this.getInputSummary());

    // Status indicator.
    const statusEl = headerEl.createSpan({ cls: "claude-code-tool-call-status" });
    statusEl.addClass(this.getStatusClass());
    statusEl.setText(this.getStatusText());

    // Subagent progress indicator (shown when subagent is running).
    if (this.toolCall.isSubagent && this.isSubagentRunning()) {
      this.renderSubagentProgress();
    }

    // Content (input/output details).
    this.contentEl = this.containerEl.createDiv({ cls: "claude-code-tool-call-content" });
    this.renderContent();
  }

  // Render progress indicator for running subagents.
  private renderSubagentProgress() {
    const progressEl = this.containerEl.createDiv({ cls: "claude-code-subagent-progress" });

    // Animated spinner.
    progressEl.createSpan({ cls: "subagent-spinner" });

    // Status message.
    const messageEl = progressEl.createSpan({ cls: "subagent-message" });
    messageEl.setText(this.toolCall.subagentProgress?.message || "Running...");

    // Duration timer.
    if (this.toolCall.subagentProgress?.startTime) {
      const duration = Date.now() - this.toolCall.subagentProgress.startTime;
      const durationEl = progressEl.createSpan({ cls: "subagent-duration" });
      durationEl.setText(this.formatDuration(duration));
    }
  }

  // Check if subagent is in a running state.
  private isSubagentRunning(): boolean {
    const status = this.toolCall.subagentStatus;
    return status === "starting" || status === "running" || status === "thinking";
  }

  // Format duration in human-readable format.
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private renderContent() {
    if (!this.contentEl) return;
    this.contentEl.empty();

    // Input.
    const inputSection = this.contentEl.createDiv();
    inputSection.createEl("strong", { text: "Input:" });
    const inputPre = inputSection.createEl("pre");
    inputPre.setText(JSON.stringify(this.toolCall.input, null, 2));

    // Output (if available).
    if (this.toolCall.output !== undefined) {
      const outputSection = this.contentEl.createDiv();
      outputSection.createEl("strong", { text: "Output:" });
      const outputPre = outputSection.createEl("pre");
      outputPre.setText(
        typeof this.toolCall.output === "string"
          ? this.toolCall.output
          : JSON.stringify(this.toolCall.output, null, 2)
      );
    }

    // Error (if any).
    if (this.toolCall.error) {
      const errorSection = this.contentEl.createDiv({ cls: "claude-code-tool-call-error" });
      errorSection.createEl("strong", { text: "Error:" });
      errorSection.createSpan({ text: this.toolCall.error });
    }

    // Timing.
    if (this.toolCall.endTime) {
      const duration = this.toolCall.endTime - this.toolCall.startTime;
      const timingEl = this.contentEl.createDiv({ cls: "claude-code-tool-call-timing" });
      timingEl.setText(`Duration: ${duration}ms`);
    }
  }

  // Get a friendly display name for the tool.
  private getDisplayName(): string {
    const name = this.toolCall.name;
    const input = this.toolCall.input;

    // For Skill tool, show which skill is being invoked.
    if (name === "Skill" && input.skill) {
      return `Skill: ${input.skill}`;
    }

    // For Task/subagent tool, show the agent type.
    if (name === "Task" && input.subagent_type) {
      return `Task: ${input.subagent_type}`;
    }

    // For MCP tools, make the name more readable.
    if (name.startsWith("mcp__obsidian__")) {
      const shortName = name.replace("mcp__obsidian__", "");
      return shortName.replace(/_/g, " ");
    }

    return name;
  }

  private getInputSummary(): string {
    const input = this.toolCall.input;
    const name = this.toolCall.name;

    // Special handling for Skill - show the skill description.
    if (name === "Skill" && input.args) {
      const args = String(input.args);
      return args.length > 40 ? args.slice(0, 40) + "..." : args;
    }

    // Special handling for Task - show the description.
    if (name === "Task" && input.description) {
      return String(input.description);
    }

    // Try to get a meaningful summary based on common input patterns.
    if (input.file_path) {
      return String(input.file_path).split("/").pop() || "";
    }
    if (input.path) {
      return String(input.path).split("/").pop() || "";
    }
    if (input.pattern) {
      return String(input.pattern);
    }
    if (input.command) {
      const cmd = String(input.command);
      return cmd.length > 30 ? cmd.slice(0, 30) + "..." : cmd;
    }
    if (input.query) {
      const q = String(input.query);
      return q.length > 30 ? q.slice(0, 30) + "..." : q;
    }

    // Fallback: show number of keys.
    const keys = Object.keys(input);
    return keys.length > 0 ? `${keys.length} params` : "";
  }

  private getStatusText(): string {
    // For subagents, use the subagent-specific status.
    if (this.toolCall.isSubagent && this.toolCall.subagentStatus) {
      switch (this.toolCall.subagentStatus) {
        case "starting":
          return "starting...";
        case "running":
          return "running...";
        case "thinking":
          return "thinking...";
        case "completed":
          return "✓";
        case "interrupted":
          return "⚠ interrupted";
        case "error":
          return "✗";
        default:
          break;
      }
    }

    // Fallback to standard tool status.
    switch (this.toolCall.status) {
      case "pending":
        return "pending";
      case "running":
        return "running...";
      case "success":
        return "✓";
      case "error":
        return "✗";
      default:
        return "";
    }
  }

  // Get CSS class for status indicator.
  private getStatusClass(): string {
    // For subagents, use the subagent-specific status class.
    if (this.toolCall.isSubagent && this.toolCall.subagentStatus) {
      return this.toolCall.subagentStatus;
    }
    return this.toolCall.status;
  }

  private toggle() {
    this.isExpanded = !this.isExpanded;
    this.render();
  }

  update(updates: Partial<ToolCall>) {
    Object.assign(this.toolCall, updates);
    this.render();
  }

  expand() {
    this.isExpanded = true;
    this.render();
  }

  collapse() {
    this.isExpanded = false;
    this.render();
  }
}
