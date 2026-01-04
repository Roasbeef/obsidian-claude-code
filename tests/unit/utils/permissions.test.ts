import { describe, it, expect } from "vitest";
import {
  READ_ONLY_TOOLS,
  WRITE_TOOLS,
  OBSIDIAN_UI_TOOLS,
  SUBAGENT_TOOLS,
  SYSTEM_TOOLS,
  isReadOnlyTool,
  isWriteTool,
  isObsidianUiTool,
  isSubagentTool,
  isSystemTool,
  getToolRiskLevel,
  shouldAutoApprove,
  buildToolDescription,
} from "../../../src/utils/permissions";

describe("permissions utilities", () => {
  describe("tool constants", () => {
    it("should have expected read-only tools", () => {
      expect(READ_ONLY_TOOLS).toContain("Read");
      expect(READ_ONLY_TOOLS).toContain("Glob");
      expect(READ_ONLY_TOOLS).toContain("Grep");
      expect(READ_ONLY_TOOLS).toContain("LS");
      expect(READ_ONLY_TOOLS).toContain("mcp__obsidian__get_active_file");
    });

    it("should have expected write tools", () => {
      expect(WRITE_TOOLS).toContain("Write");
      expect(WRITE_TOOLS).toContain("Edit");
      expect(WRITE_TOOLS).toContain("MultiEdit");
    });

    it("should have expected UI tools", () => {
      expect(OBSIDIAN_UI_TOOLS).toContain("mcp__obsidian__open_file");
      expect(OBSIDIAN_UI_TOOLS).toContain("mcp__obsidian__show_notice");
      expect(OBSIDIAN_UI_TOOLS).toContain("mcp__obsidian__execute_command");
    });

    it("should have expected subagent tools", () => {
      expect(SUBAGENT_TOOLS).toContain("Task");
    });

    it("should have expected system tools", () => {
      expect(SYSTEM_TOOLS).toContain("Bash");
    });
  });

  describe("isReadOnlyTool", () => {
    it("should return true for read-only tools", () => {
      expect(isReadOnlyTool("Read")).toBe(true);
      expect(isReadOnlyTool("Glob")).toBe(true);
      expect(isReadOnlyTool("Grep")).toBe(true);
      expect(isReadOnlyTool("LS")).toBe(true);
      expect(isReadOnlyTool("mcp__obsidian__get_active_file")).toBe(true);
    });

    it("should return false for non-read-only tools", () => {
      expect(isReadOnlyTool("Write")).toBe(false);
      expect(isReadOnlyTool("Bash")).toBe(false);
      expect(isReadOnlyTool("Task")).toBe(false);
      expect(isReadOnlyTool("UnknownTool")).toBe(false);
    });
  });

  describe("isWriteTool", () => {
    it("should return true for write tools", () => {
      expect(isWriteTool("Write")).toBe(true);
      expect(isWriteTool("Edit")).toBe(true);
      expect(isWriteTool("MultiEdit")).toBe(true);
    });

    it("should return false for non-write tools", () => {
      expect(isWriteTool("Read")).toBe(false);
      expect(isWriteTool("Bash")).toBe(false);
    });
  });

  describe("isObsidianUiTool", () => {
    it("should return true for UI tools", () => {
      expect(isObsidianUiTool("mcp__obsidian__open_file")).toBe(true);
      expect(isObsidianUiTool("mcp__obsidian__show_notice")).toBe(true);
      expect(isObsidianUiTool("mcp__obsidian__reveal_in_explorer")).toBe(true);
    });

    it("should return false for non-UI tools", () => {
      expect(isObsidianUiTool("mcp__obsidian__get_active_file")).toBe(false);  // This is read-only.
      expect(isObsidianUiTool("Write")).toBe(false);
    });
  });

  describe("isSubagentTool", () => {
    it("should return true for Task", () => {
      expect(isSubagentTool("Task")).toBe(true);
    });

    it("should return false for other tools", () => {
      expect(isSubagentTool("Read")).toBe(false);
      expect(isSubagentTool("Skill")).toBe(false);
    });
  });

  describe("isSystemTool", () => {
    it("should return true for Bash", () => {
      expect(isSystemTool("Bash")).toBe(true);
    });

    it("should return false for other tools", () => {
      expect(isSystemTool("Write")).toBe(false);
      expect(isSystemTool("Task")).toBe(false);
    });
  });

  describe("getToolRiskLevel", () => {
    it("should return none for read-only tools", () => {
      expect(getToolRiskLevel("Read")).toBe("none");
      expect(getToolRiskLevel("Glob")).toBe("none");
    });

    it("should return low for UI tools", () => {
      expect(getToolRiskLevel("mcp__obsidian__open_file")).toBe("low");
    });

    it("should return medium for write tools", () => {
      expect(getToolRiskLevel("Write")).toBe("medium");
      expect(getToolRiskLevel("Edit")).toBe("medium");
    });

    it("should return high for system tools", () => {
      expect(getToolRiskLevel("Bash")).toBe("high");
    });

    it("should return low for subagent tools", () => {
      expect(getToolRiskLevel("Task")).toBe("low");
    });

    it("should return low for unknown tools", () => {
      expect(getToolRiskLevel("UnknownTool")).toBe("low");
    });
  });

  describe("shouldAutoApprove", () => {
    const defaultSettings = {
      autoApproveVaultWrites: false,
      requireBashApproval: true,
      alwaysAllowedTools: [],
    };

    it("should always auto-approve read-only tools", () => {
      expect(shouldAutoApprove("Read", defaultSettings)).toBe(true);
      expect(shouldAutoApprove("Glob", defaultSettings)).toBe(true);
    });

    it("should always auto-approve UI tools", () => {
      expect(shouldAutoApprove("mcp__obsidian__open_file", defaultSettings)).toBe(true);
    });

    it("should respect always-allowed list", () => {
      const settings = { ...defaultSettings, alwaysAllowedTools: ["Bash"] };
      expect(shouldAutoApprove("Bash", settings)).toBe(true);
    });

    it("should respect autoApproveVaultWrites setting", () => {
      expect(shouldAutoApprove("Write", { ...defaultSettings, autoApproveVaultWrites: false })).toBe(false);
      expect(shouldAutoApprove("Write", { ...defaultSettings, autoApproveVaultWrites: true })).toBe(true);
    });

    it("should respect requireBashApproval setting", () => {
      expect(shouldAutoApprove("Bash", { ...defaultSettings, requireBashApproval: true })).toBe(false);
      expect(shouldAutoApprove("Bash", { ...defaultSettings, requireBashApproval: false })).toBe(true);
    });

    it("should auto-approve subagent tools", () => {
      expect(shouldAutoApprove("Task", defaultSettings)).toBe(true);
    });

    it("should auto-approve unknown tools by default", () => {
      expect(shouldAutoApprove("WebSearch", defaultSettings)).toBe(true);
    });
  });

  describe("buildToolDescription", () => {
    it("should describe write tool with file path", () => {
      const desc = buildToolDescription("Write", { file_path: "/path/to/file.md" });
      expect(desc).toContain("write");
      expect(desc).toContain("/path/to/file.md");
    });

    it("should describe edit tool with file path", () => {
      const desc = buildToolDescription("Edit", { file_path: "src/main.ts" });
      expect(desc).toContain("edit");
      expect(desc).toContain("src/main.ts");
    });

    it("should describe bash with command", () => {
      const desc = buildToolDescription("Bash", { command: "ls -la" });
      expect(desc).toContain("shell command");
      expect(desc).toContain("ls -la");
    });

    it("should truncate long bash commands", () => {
      const longCommand = "echo " + "a".repeat(200);
      const desc = buildToolDescription("Bash", { command: longCommand });
      expect(desc).toContain("...");
      expect(desc.length).toBeLessThan(200);
    });

    it("should provide generic description for other tools", () => {
      const desc = buildToolDescription("SomeTool", { arg: "value" });
      expect(desc).toContain("SomeTool");
      expect(desc).toContain("wants to use");
    });

    it("should handle missing file path gracefully", () => {
      const desc = buildToolDescription("Write", {});
      expect(desc).toContain("a file");
    });
  });
});
