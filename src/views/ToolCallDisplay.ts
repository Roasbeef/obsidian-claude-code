import { setIcon } from "obsidian";
import { ToolCall } from "../types";
import { formatDuration } from "../utils/formatting";
import {
  getToolDisplayName,
  getToolInputSummary,
  getToolStatusText,
  getToolStatusClass,
  isSubagentRunning,
  type SubagentStatus,
  type ToolStatus,
} from "../utils/toolDisplay";

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
    nameEl.setText(getToolDisplayName(this.toolCall.name, this.toolCall.input));

    // Brief description of input.
    const descEl = headerEl.createSpan({ cls: "claude-code-tool-call-desc" });
    descEl.setText(getToolInputSummary(this.toolCall.name, this.toolCall.input));

    // Status indicator.
    const statusEl = headerEl.createSpan({ cls: "claude-code-tool-call-status" });
    statusEl.addClass(getToolStatusClass(
      this.toolCall.status as ToolStatus,
      !!this.toolCall.isSubagent,
      this.toolCall.subagentStatus as SubagentStatus | undefined
    ));
    statusEl.setText(getToolStatusText(
      this.toolCall.status as ToolStatus,
      !!this.toolCall.isSubagent,
      this.toolCall.subagentStatus as SubagentStatus | undefined
    ));

    // Subagent progress indicator (shown when subagent is running).
    if (this.toolCall.isSubagent && isSubagentRunning(this.toolCall.subagentStatus as SubagentStatus | undefined)) {
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
      durationEl.setText(formatDuration(duration));
    }
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
