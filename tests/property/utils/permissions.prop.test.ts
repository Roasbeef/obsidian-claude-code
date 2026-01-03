import { describe, it, expect } from "vitest";
import fc from "fast-check";
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

describe("permissions property tests", () => {
  describe("tool category functions", () => {
    it("each tool should belong to at most one primary category", () => {
      // Collect all known tools.
      const allTools = [
        ...READ_ONLY_TOOLS,
        ...WRITE_TOOLS,
        ...OBSIDIAN_UI_TOOLS,
        ...SUBAGENT_TOOLS,
        ...SYSTEM_TOOLS,
      ];

      for (const tool of allTools) {
        let categoryCount = 0;
        if (isReadOnlyTool(tool)) categoryCount++;
        if (isWriteTool(tool)) categoryCount++;
        if (isObsidianUiTool(tool)) categoryCount++;
        if (isSubagentTool(tool)) categoryCount++;
        if (isSystemTool(tool)) categoryCount++;

        // Each tool should be in exactly one category.
        expect(categoryCount).toBe(1);
      }
    });

    it("isReadOnlyTool should be consistent with READ_ONLY_TOOLS", () => {
      for (const tool of READ_ONLY_TOOLS) {
        expect(isReadOnlyTool(tool)).toBe(true);
      }
    });

    it("isWriteTool should be consistent with WRITE_TOOLS", () => {
      for (const tool of WRITE_TOOLS) {
        expect(isWriteTool(tool)).toBe(true);
      }
    });

    it("isObsidianUiTool should be consistent with OBSIDIAN_UI_TOOLS", () => {
      for (const tool of OBSIDIAN_UI_TOOLS) {
        expect(isObsidianUiTool(tool)).toBe(true);
      }
    });

    it("isSubagentTool should be consistent with SUBAGENT_TOOLS", () => {
      for (const tool of SUBAGENT_TOOLS) {
        expect(isSubagentTool(tool)).toBe(true);
      }
    });

    it("isSystemTool should be consistent with SYSTEM_TOOLS", () => {
      for (const tool of SYSTEM_TOOLS) {
        expect(isSystemTool(tool)).toBe(true);
      }
    });
  });

  describe("getToolRiskLevel", () => {
    it("read-only tools should have no risk", () => {
      for (const tool of READ_ONLY_TOOLS) {
        expect(getToolRiskLevel(tool)).toBe("none");
      }
    });

    it("UI tools should have low risk", () => {
      for (const tool of OBSIDIAN_UI_TOOLS) {
        expect(getToolRiskLevel(tool)).toBe("low");
      }
    });

    it("write tools should have medium risk", () => {
      for (const tool of WRITE_TOOLS) {
        expect(getToolRiskLevel(tool)).toBe("medium");
      }
    });

    it("system tools should have high risk", () => {
      for (const tool of SYSTEM_TOOLS) {
        expect(getToolRiskLevel(tool)).toBe("high");
      }
    });

    it("unknown tools should have low risk", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 30 }), (toolName) => {
          // Skip if it's a known tool.
          const allKnown = [
            ...READ_ONLY_TOOLS,
            ...WRITE_TOOLS,
            ...OBSIDIAN_UI_TOOLS,
            ...SUBAGENT_TOOLS,
            ...SYSTEM_TOOLS,
          ];
          if (allKnown.includes(toolName as any)) return;

          expect(getToolRiskLevel(toolName)).toBe("low");
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("shouldAutoApprove", () => {
    const defaultSettings = {
      autoApproveVaultWrites: false,
      requireBashApproval: true,
      alwaysAllowedTools: [] as string[],
    };

    it("read-only tools should always auto-approve regardless of settings", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...READ_ONLY_TOOLS),
          fc.boolean(),
          fc.boolean(),
          fc.array(fc.string(), { maxLength: 5 }),
          (tool, autoWrites, requireBash, allowedTools) => {
            const settings = {
              autoApproveVaultWrites: autoWrites,
              requireBashApproval: requireBash,
              alwaysAllowedTools: allowedTools,
            };
            expect(shouldAutoApprove(tool, settings)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("UI tools should always auto-approve regardless of settings", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...OBSIDIAN_UI_TOOLS),
          fc.boolean(),
          fc.boolean(),
          (tool, autoWrites, requireBash) => {
            const settings = {
              autoApproveVaultWrites: autoWrites,
              requireBashApproval: requireBash,
              alwaysAllowedTools: [],
            };
            expect(shouldAutoApprove(tool, settings)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("subagent tools should always auto-approve", () => {
      fc.assert(
        fc.property(fc.constantFrom(...SUBAGENT_TOOLS), (tool) => {
          expect(shouldAutoApprove(tool, defaultSettings)).toBe(true);
        }),
        { numRuns: 10 }
      );
    });

    it("always-allowed list should override other settings", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...WRITE_TOOLS, ...SYSTEM_TOOLS),
          (tool) => {
            const settings = {
              autoApproveVaultWrites: false,
              requireBashApproval: true,
              alwaysAllowedTools: [tool],
            };
            expect(shouldAutoApprove(tool, settings)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it("write tools should respect autoApproveVaultWrites setting", () => {
      for (const tool of WRITE_TOOLS) {
        expect(shouldAutoApprove(tool, { ...defaultSettings, autoApproveVaultWrites: true })).toBe(true);
        expect(shouldAutoApprove(tool, { ...defaultSettings, autoApproveVaultWrites: false })).toBe(false);
      }
    });

    it("Bash should respect requireBashApproval setting", () => {
      expect(shouldAutoApprove("Bash", { ...defaultSettings, requireBashApproval: true })).toBe(false);
      expect(shouldAutoApprove("Bash", { ...defaultSettings, requireBashApproval: false })).toBe(true);
    });
  });

  describe("buildToolDescription", () => {
    it("should always return a non-empty string", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.dictionary(fc.string(), fc.string()),
          (toolName, input) => {
            const result = buildToolDescription(toolName, input);
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include tool name for unknown tools", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !["Write", "Edit", "MultiEdit", "Bash"].includes(s)
          ),
          (toolName) => {
            const result = buildToolDescription(toolName, {});
            expect(result).toContain(toolName);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should include file path for write tools", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...WRITE_TOOLS),
          fc.string({ minLength: 1, maxLength: 50 }),
          (tool, filePath) => {
            const result = buildToolDescription(tool, { file_path: filePath });
            expect(result).toContain(filePath);
          }
        ),
        { numRuns: 30 }
      );
    });

    it("should include command for Bash tool", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (command) => {
          const result = buildToolDescription("Bash", { command });
          expect(result.toLowerCase()).toContain("shell command");
        }),
        { numRuns: 30 }
      );
    });

    it("should truncate long commands", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 150, maxLength: 200 }), (command) => {
          const result = buildToolDescription("Bash", { command });
          expect(result).toContain("...");
          expect(result.length).toBeLessThan(command.length + 100);
        }),
        { numRuns: 20 }
      );
    });
  });
});
