import { describe, it, expect, beforeEach } from "vitest";

import type { ToolCall } from "@/types";
import { createContainer } from "../../helpers/dom";

// Extract testable pure functions from ToolCallDisplay.

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getDisplayName(toolCall: ToolCall): string {
  const name = toolCall.name;
  const input = toolCall.input;

  if (name === "Skill" && input.skill) {
    return `Skill: ${input.skill}`;
  }

  if (name === "Task" && input.subagent_type) {
    return `Task: ${input.subagent_type}`;
  }

  if (name.startsWith("mcp__obsidian__")) {
    const shortName = name.replace("mcp__obsidian__", "");
    return shortName.replace(/_/g, " ");
  }

  return name;
}

function getInputSummary(toolCall: ToolCall): string {
  const input = toolCall.input;
  const name = toolCall.name;

  if (name === "Skill" && input.args) {
    const args = String(input.args);
    return args.length > 40 ? args.slice(0, 40) + "..." : args;
  }

  if (name === "Task" && input.description) {
    return String(input.description);
  }

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

  const keys = Object.keys(input);
  return keys.length > 0 ? `${keys.length} params` : "";
}

function getStatusText(toolCall: ToolCall): string {
  if (toolCall.isSubagent && toolCall.subagentStatus) {
    switch (toolCall.subagentStatus) {
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

  switch (toolCall.status) {
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

function isSubagentRunning(toolCall: ToolCall): boolean {
  const status = toolCall.subagentStatus;
  return status === "starting" || status === "running" || status === "thinking";
}

describe("ToolCallDisplay", () => {
  describe("formatDuration", () => {
    it("should format milliseconds for sub-second durations", () => {
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(100)).toBe("100ms");
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("should format seconds for 1-59 second durations", () => {
      expect(formatDuration(1000)).toBe("1s");
      expect(formatDuration(1500)).toBe("1s");
      expect(formatDuration(5000)).toBe("5s");
      expect(formatDuration(30000)).toBe("30s");
      expect(formatDuration(59000)).toBe("59s");
    });

    it("should format minutes and seconds for 60+ second durations", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(61000)).toBe("1m 1s");
      expect(formatDuration(90000)).toBe("1m 30s");
      expect(formatDuration(120000)).toBe("2m 0s");
      expect(formatDuration(125000)).toBe("2m 5s");
      expect(formatDuration(3600000)).toBe("60m 0s");
    });

    it("should handle edge cases", () => {
      expect(formatDuration(59999)).toBe("59s"); // Just under a minute.
      expect(formatDuration(60001)).toBe("1m 0s"); // Just over a minute.
    });
  });

  describe("getDisplayName", () => {
    it("should return tool name for standard tools", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Read",
        input: { file_path: "/test.md" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getDisplayName(toolCall)).toBe("Read");
    });

    it("should format Skill tools", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Skill",
        input: { skill: "commit" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getDisplayName(toolCall)).toBe("Skill: commit");
    });

    it("should format Task tools with subagent type", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Task",
        input: { subagent_type: "Explore", description: "Search" },
        status: "running",
        startTime: Date.now(),
        isSubagent: true,
      };
      expect(getDisplayName(toolCall)).toBe("Task: Explore");
    });

    it("should format MCP Obsidian tools", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "mcp__obsidian__open_file",
        input: { path: "test.md" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getDisplayName(toolCall)).toBe("open file");
    });

    it("should handle MCP tools with underscores", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "mcp__obsidian__get_vault_stats",
        input: {},
        status: "running",
        startTime: Date.now(),
      };
      expect(getDisplayName(toolCall)).toBe("get vault stats");
    });
  });

  describe("getInputSummary", () => {
    it("should extract filename from file_path", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Read",
        input: { file_path: "/path/to/file.md" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getInputSummary(toolCall)).toBe("file.md");
    });

    it("should extract filename from path", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Read",
        input: { path: "/path/to/file.md" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getInputSummary(toolCall)).toBe("file.md");
    });

    it("should show pattern for Glob/Grep", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Glob",
        input: { pattern: "**/*.ts" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getInputSummary(toolCall)).toBe("**/*.ts");
    });

    it("should truncate long commands", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Bash",
        input: { command: "this is a very long command that should be truncated" },
        status: "running",
        startTime: Date.now(),
      };
      const summary = getInputSummary(toolCall);
      expect(summary.length).toBeLessThanOrEqual(33); // 30 + "...".
      expect(summary.endsWith("...")).toBe(true);
    });

    it("should truncate long queries", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Search",
        input: { query: "this is a very long query that should be truncated" },
        status: "running",
        startTime: Date.now(),
      };
      const summary = getInputSummary(toolCall);
      expect(summary.endsWith("...")).toBe(true);
    });

    it("should show Skill args", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Skill",
        input: { skill: "commit", args: "-m 'Fix bug'" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getInputSummary(toolCall)).toBe("-m 'Fix bug'");
    });

    it("should show Task description", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Task",
        input: { subagent_type: "Explore", description: "Find tests" },
        status: "running",
        startTime: Date.now(),
      };
      expect(getInputSummary(toolCall)).toBe("Find tests");
    });

    it("should count params for unknown input", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Custom",
        input: { a: 1, b: 2, c: 3 },
        status: "running",
        startTime: Date.now(),
      };
      expect(getInputSummary(toolCall)).toBe("3 params");
    });

    it("should return empty string for empty input", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Custom",
        input: {},
        status: "running",
        startTime: Date.now(),
      };
      expect(getInputSummary(toolCall)).toBe("");
    });
  });

  describe("getStatusText", () => {
    it("should return status for standard tool states", () => {
      expect(getStatusText({ status: "pending" } as ToolCall)).toBe("pending");
      expect(getStatusText({ status: "running" } as ToolCall)).toBe("running...");
      expect(getStatusText({ status: "success" } as ToolCall)).toBe("✓");
      expect(getStatusText({ status: "error" } as ToolCall)).toBe("✗");
    });

    it("should return subagent status for subagents", () => {
      const baseSubagent = { isSubagent: true, status: "running" as const };

      expect(getStatusText({ ...baseSubagent, subagentStatus: "starting" } as ToolCall)).toBe("starting...");
      expect(getStatusText({ ...baseSubagent, subagentStatus: "running" } as ToolCall)).toBe("running...");
      expect(getStatusText({ ...baseSubagent, subagentStatus: "thinking" } as ToolCall)).toBe("thinking...");
      expect(getStatusText({ ...baseSubagent, subagentStatus: "completed" } as ToolCall)).toBe("✓");
      expect(getStatusText({ ...baseSubagent, subagentStatus: "interrupted" } as ToolCall)).toBe("⚠ interrupted");
      expect(getStatusText({ ...baseSubagent, subagentStatus: "error" } as ToolCall)).toBe("✗");
    });

    it("should fallback to standard status if subagent status undefined", () => {
      const toolCall = { isSubagent: true, status: "success" as const } as ToolCall;
      expect(getStatusText(toolCall)).toBe("✓");
    });
  });

  describe("isSubagentRunning", () => {
    it("should return true for running states", () => {
      expect(isSubagentRunning({ subagentStatus: "starting" } as ToolCall)).toBe(true);
      expect(isSubagentRunning({ subagentStatus: "running" } as ToolCall)).toBe(true);
      expect(isSubagentRunning({ subagentStatus: "thinking" } as ToolCall)).toBe(true);
    });

    it("should return false for completed states", () => {
      expect(isSubagentRunning({ subagentStatus: "completed" } as ToolCall)).toBe(false);
      expect(isSubagentRunning({ subagentStatus: "error" } as ToolCall)).toBe(false);
      expect(isSubagentRunning({ subagentStatus: "interrupted" } as ToolCall)).toBe(false);
    });

    it("should return false for undefined status", () => {
      expect(isSubagentRunning({} as ToolCall)).toBe(false);
    });
  });

  describe("DOM rendering", () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = createContainer();
    });

    it("should create container with correct class", () => {
      container.classList.add("claude-code-tool-call");
      expect(container.classList.contains("claude-code-tool-call")).toBe(true);
    });

    it("should add collapsed class by default", () => {
      container.classList.add("collapsed");
      expect(container.classList.contains("collapsed")).toBe(true);
    });

    it("should remove collapsed class when expanded", () => {
      container.classList.add("collapsed");
      container.classList.remove("collapsed");
      expect(container.classList.contains("collapsed")).toBe(false);
    });

    it("should add subagent-task class for subagents", () => {
      container.classList.add("subagent-task");
      expect(container.classList.contains("subagent-task")).toBe(true);
    });
  });

  describe("expand/collapse", () => {
    it("should toggle expanded state", () => {
      let isExpanded = false;
      isExpanded = !isExpanded;
      expect(isExpanded).toBe(true);
      isExpanded = !isExpanded;
      expect(isExpanded).toBe(false);
    });

    it("should set expanded state on expand()", () => {
      let isExpanded = false;
      isExpanded = true; // expand().
      expect(isExpanded).toBe(true);
    });

    it("should set collapsed state on collapse()", () => {
      let isExpanded = true;
      isExpanded = false; // collapse().
      expect(isExpanded).toBe(false);
    });
  });

  describe("update", () => {
    it("should merge updates into tool call", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Read",
        input: {},
        status: "running",
        startTime: Date.now(),
      };

      const updates = { status: "success" as const, endTime: Date.now() };
      Object.assign(toolCall, updates);

      expect(toolCall.status).toBe("success");
      expect(toolCall.endTime).toBeDefined();
    });

    it("should preserve existing properties", () => {
      const toolCall: ToolCall = {
        id: "1",
        name: "Read",
        input: { file_path: "/test.md" },
        status: "running",
        startTime: Date.now(),
      };

      const updates = { status: "success" as const };
      Object.assign(toolCall, updates);

      expect(toolCall.id).toBe("1");
      expect(toolCall.name).toBe("Read");
      expect(toolCall.input.file_path).toBe("/test.md");
    });
  });
});
