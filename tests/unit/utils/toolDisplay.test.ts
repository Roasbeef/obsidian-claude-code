import { describe, it, expect } from "vitest";
import {
  getToolDisplayName,
  getToolInputSummary,
  getToolStatusText,
  getToolStatusClass,
  isSubagentRunning,
  isSubagentTool,
  getSubagentType,
} from "../../../src/utils/toolDisplay";

describe("toolDisplay utilities", () => {
  describe("getToolDisplayName", () => {
    it("should return Skill name for Skill tool", () => {
      expect(getToolDisplayName("Skill", { skill: "commit" })).toBe("Skill: commit");
      expect(getToolDisplayName("Skill", { skill: "review-pr" })).toBe("Skill: review-pr");
    });

    it("should return Task type for Task tool", () => {
      expect(getToolDisplayName("Task", { subagent_type: "Explore" })).toBe("Task: Explore");
      expect(getToolDisplayName("Task", { subagent_type: "code-reviewer" })).toBe("Task: code-reviewer");
    });

    it("should format MCP tool names nicely", () => {
      expect(getToolDisplayName("mcp__obsidian__open_file", {})).toBe("open file");
      expect(getToolDisplayName("mcp__obsidian__get_active_file", {})).toBe("get active file");
      expect(getToolDisplayName("mcp__obsidian__execute_command", {})).toBe("execute command");
    });

    it("should return regular tool names unchanged", () => {
      expect(getToolDisplayName("Read", {})).toBe("Read");
      expect(getToolDisplayName("Write", {})).toBe("Write");
      expect(getToolDisplayName("Bash", {})).toBe("Bash");
      expect(getToolDisplayName("Grep", {})).toBe("Grep");
    });

    it("should handle missing skill/subagent_type", () => {
      expect(getToolDisplayName("Skill", {})).toBe("Skill");
      expect(getToolDisplayName("Task", {})).toBe("Task");
    });
  });

  describe("getToolInputSummary", () => {
    it("should summarize Skill args", () => {
      expect(getToolInputSummary("Skill", { args: "short args" })).toBe("short args");
      expect(getToolInputSummary("Skill", { args: "a".repeat(50) })).toBe("a".repeat(40) + "...");
    });

    it("should summarize Task description", () => {
      expect(getToolInputSummary("Task", { description: "Find all TypeScript files" })).toBe(
        "Find all TypeScript files"
      );
    });

    it("should extract file_path", () => {
      expect(getToolInputSummary("Read", { file_path: "/path/to/file.ts" })).toBe("file.ts");
      expect(getToolInputSummary("Write", { file_path: "src/main.ts" })).toBe("main.ts");
    });

    it("should extract path", () => {
      expect(getToolInputSummary("Glob", { path: "/path/to/dir" })).toBe("dir");
    });

    it("should extract pattern", () => {
      expect(getToolInputSummary("Grep", { pattern: "function.*test" })).toBe("function.*test");
    });

    it("should truncate command", () => {
      expect(getToolInputSummary("Bash", { command: "ls -la" })).toBe("ls -la");
      expect(getToolInputSummary("Bash", { command: "a".repeat(50) })).toBe("a".repeat(30) + "...");
    });

    it("should truncate query", () => {
      expect(getToolInputSummary("WebSearch", { query: "typescript testing" })).toBe(
        "typescript testing"
      );
      expect(getToolInputSummary("WebSearch", { query: "a".repeat(50) })).toBe("a".repeat(30) + "...");
    });

    it("should show param count as fallback", () => {
      expect(getToolInputSummary("SomeTool", { a: 1, b: 2, c: 3 })).toBe("3 params");
      expect(getToolInputSummary("SomeTool", { single: "value" })).toBe("1 params");
    });

    it("should return empty string for empty input", () => {
      expect(getToolInputSummary("SomeTool", {})).toBe("");
    });
  });

  describe("getToolStatusText", () => {
    describe("with subagent status", () => {
      it("should return starting text", () => {
        expect(getToolStatusText("running", true, "starting")).toBe("starting...");
      });

      it("should return running text", () => {
        expect(getToolStatusText("running", true, "running")).toBe("running...");
      });

      it("should return thinking text", () => {
        expect(getToolStatusText("running", true, "thinking")).toBe("thinking...");
      });

      it("should return completed text", () => {
        expect(getToolStatusText("running", true, "completed")).toBe("✓");
      });

      it("should return interrupted text", () => {
        expect(getToolStatusText("running", true, "interrupted")).toBe("⚠ interrupted");
      });

      it("should return error text", () => {
        expect(getToolStatusText("running", true, "error")).toBe("✗");
      });
    });

    describe("with standard tool status", () => {
      it("should return pending text", () => {
        expect(getToolStatusText("pending", false, undefined)).toBe("pending");
      });

      it("should return running text", () => {
        expect(getToolStatusText("running", false, undefined)).toBe("running...");
      });

      it("should return success text", () => {
        expect(getToolStatusText("success", false, undefined)).toBe("✓");
      });

      it("should return error text", () => {
        expect(getToolStatusText("error", false, undefined)).toBe("✗");
      });
    });

    it("should prioritize subagent status over tool status", () => {
      expect(getToolStatusText("error", true, "running")).toBe("running...");
      expect(getToolStatusText("success", true, "starting")).toBe("starting...");
    });
  });

  describe("getToolStatusClass", () => {
    it("should return subagent status when isSubagent", () => {
      expect(getToolStatusClass("running", true, "completed")).toBe("completed");
      expect(getToolStatusClass("running", true, "error")).toBe("error");
    });

    it("should return tool status when not subagent", () => {
      expect(getToolStatusClass("running", false, undefined)).toBe("running");
      expect(getToolStatusClass("success", false, undefined)).toBe("success");
    });
  });

  describe("isSubagentRunning", () => {
    it("should return true for running states", () => {
      expect(isSubagentRunning("starting")).toBe(true);
      expect(isSubagentRunning("running")).toBe(true);
      expect(isSubagentRunning("thinking")).toBe(true);
    });

    it("should return false for terminal states", () => {
      expect(isSubagentRunning("completed")).toBe(false);
      expect(isSubagentRunning("error")).toBe(false);
      expect(isSubagentRunning("interrupted")).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isSubagentRunning(undefined)).toBe(false);
    });
  });

  describe("isSubagentTool", () => {
    it("should return true for Task tool", () => {
      expect(isSubagentTool("Task")).toBe(true);
    });

    it("should return false for other tools", () => {
      expect(isSubagentTool("Read")).toBe(false);
      expect(isSubagentTool("Write")).toBe(false);
      expect(isSubagentTool("Skill")).toBe(false);
      expect(isSubagentTool("Bash")).toBe(false);
    });
  });

  describe("getSubagentType", () => {
    it("should extract subagent_type from input", () => {
      expect(getSubagentType({ subagent_type: "Explore" })).toBe("Explore");
      expect(getSubagentType({ subagent_type: "code-reviewer" })).toBe("code-reviewer");
    });

    it("should return unknown for missing subagent_type", () => {
      expect(getSubagentType({})).toBe("unknown");
      expect(getSubagentType({ other: "value" })).toBe("unknown");
    });
  });
});
