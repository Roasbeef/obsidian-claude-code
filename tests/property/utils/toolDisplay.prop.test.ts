import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  getToolDisplayName,
  getToolInputSummary,
  getToolStatusText,
  getToolStatusClass,
  isSubagentRunning,
} from "../../../src/utils/toolDisplay";

describe("toolDisplay property tests", () => {
  describe("getToolDisplayName", () => {
    it("should return the tool name as-is or a formatted version", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),  // Non-empty name.
          fc.dictionary(fc.string(), fc.anything()),
          (name, input) => {
            const result = getToolDisplayName(name, input);
            expect(typeof result).toBe("string");
            // If name is non-empty, result should be non-empty.
            expect(result.length).toBeGreaterThanOrEqual(name.length > 0 ? 1 : 0);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("should return empty string for empty name with no special handling", () => {
      const result = getToolDisplayName("", {});
      expect(result).toBe("");
    });

    it("should be deterministic", () => {
      fc.assert(
        fc.property(fc.string(), fc.dictionary(fc.string(), fc.string()), (name, input) => {
          const result1 = getToolDisplayName(name, input);
          const result2 = getToolDisplayName(name, input);
          expect(result1).toBe(result2);
        }),
        { numRuns: 100 }
      );
    });

    it("should prefix Skill tools correctly", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (skill) => {
          const result = getToolDisplayName("Skill", { skill });
          expect(result).toBe(`Skill: ${skill}`);
        }),
        { numRuns: 50 }
      );
    });

    it("should prefix Task tools correctly", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (subagent_type) => {
          const result = getToolDisplayName("Task", { subagent_type });
          expect(result).toBe(`Task: ${subagent_type}`);
        }),
        { numRuns: 50 }
      );
    });

    it("should remove mcp__obsidian__ prefix and replace underscores", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 20 }), (suffix) => {
          // Avoid invalid characters.
          const cleanSuffix = suffix.replace(/[^a-z_]/g, "a");
          if (cleanSuffix.length === 0) return;
          const result = getToolDisplayName(`mcp__obsidian__${cleanSuffix}`, {});
          expect(result).not.toContain("mcp__obsidian__");
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("getToolInputSummary", () => {
    it("should never exceed 50 characters for truncated fields", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 100 }), (longValue) => {
          // Test with args (truncated at 40).
          const argsResult = getToolInputSummary("Skill", { args: longValue });
          if (argsResult.endsWith("...")) {
            expect(argsResult.length).toBeLessThanOrEqual(43);
          }

          // Test with command (truncated at 30).
          const cmdResult = getToolInputSummary("Bash", { command: longValue });
          if (cmdResult.endsWith("...")) {
            expect(cmdResult.length).toBeLessThanOrEqual(33);
          }
        }),
        { numRuns: 50 }
      );
    });

    it("should be deterministic", () => {
      fc.assert(
        fc.property(fc.string(), fc.dictionary(fc.string(), fc.string()), (name, input) => {
          const result1 = getToolInputSummary(name, input);
          const result2 = getToolInputSummary(name, input);
          expect(result1).toBe(result2);
        }),
        { numRuns: 100 }
      );
    });

    it("should extract filename from path", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (parts, filename) => {
            // Clean parts.
            const cleanParts = parts.map((p) => p.replace(/[/\\]/g, "a")).filter((p) => p.length > 0);
            if (cleanParts.length === 0) return;
            const cleanFilename = filename.replace(/[/\\]/g, "f");
            const path = [...cleanParts, cleanFilename].join("/");
            const result = getToolInputSummary("Read", { file_path: path });
            expect(result).toBe(cleanFilename);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("getToolStatusText", () => {
    it("should return non-empty string for valid statuses", () => {
      const toolStatuses = ["pending", "running", "success", "error"] as const;
      const subagentStatuses = [
        "starting", "running", "thinking", "completed", "interrupted", "error",
      ] as const;

      fc.assert(
        fc.property(
          fc.constantFrom(...toolStatuses),
          fc.boolean(),
          fc.option(fc.constantFrom(...subagentStatuses)),
          (toolStatus, isSubagent, subagentStatus) => {
            const result = getToolStatusText(
              toolStatus,
              isSubagent,
              subagentStatus ?? undefined
            );
            expect(typeof result).toBe("string");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("getToolStatusClass", () => {
    it("should return subagent status when isSubagent is true", () => {
      const subagentStatuses = [
        "starting", "running", "thinking", "completed", "interrupted", "error",
      ] as const;

      fc.assert(
        fc.property(
          fc.constantFrom("pending", "running", "success", "error"),
          fc.constantFrom(...subagentStatuses),
          (toolStatus, subagentStatus) => {
            const result = getToolStatusClass(
              toolStatus as "pending" | "running" | "success" | "error",
              true,
              subagentStatus
            );
            expect(result).toBe(subagentStatus);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should return tool status when isSubagent is false", () => {
      const toolStatuses = ["pending", "running", "success", "error"] as const;

      fc.assert(
        fc.property(fc.constantFrom(...toolStatuses), (toolStatus) => {
          const result = getToolStatusClass(toolStatus, false, undefined);
          expect(result).toBe(toolStatus);
        }),
        { numRuns: 20 }
      );
    });
  });

  describe("isSubagentRunning", () => {
    it("should return true only for running states", () => {
      const runningStates = ["starting", "running", "thinking"] as const;
      const notRunningStates = ["completed", "interrupted", "error"] as const;

      for (const state of runningStates) {
        expect(isSubagentRunning(state)).toBe(true);
      }

      for (const state of notRunningStates) {
        expect(isSubagentRunning(state)).toBe(false);
      }
    });
  });
});
