import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  SLASH_COMMANDS,
  filterCommands,
  nextIndex,
  prevIndex,
  isCommandTrigger,
  findMentionTrigger,
  getMentionQuery,
  getCommandQuery,
  buildFileMention,
  replaceMentionWithFile,
  buildMessageWithContexts,
} from "../../../src/utils/autocomplete";

describe("autocomplete property tests", () => {
  describe("nextIndex/prevIndex", () => {
    it("should be inverse operations", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, length) => {
            const validIndex = index % length;
            const after = nextIndex(validIndex, length);
            const back = prevIndex(after, length);
            expect(back).toBe(validIndex);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("nextIndex should always return valid index", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, length) => {
            const result = nextIndex(index % length, length);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThan(length);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("prevIndex should always return valid index", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 999 }),
          fc.integer({ min: 1, max: 1000 }),
          (index, length) => {
            const result = prevIndex(index % length, length);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThan(length);
          }
        ),
        { numRuns: 200 }
      );
    });

    it("cycling through entire list should return to start", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (length) => {
          let index = 0;
          for (let i = 0; i < length; i++) {
            index = nextIndex(index, length);
          }
          expect(index).toBe(0);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("isCommandTrigger", () => {
    it("should return true for any string starting with /", () => {
      fc.assert(
        fc.property(fc.string(), (suffix) => {
          expect(isCommandTrigger("/" + suffix)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should return false for strings not starting with /", () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.startsWith("/")),
          (text) => {
            expect(isCommandTrigger(text)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("findMentionTrigger", () => {
    it("should find @ when present without trailing space", () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 50 }).filter((s) => !s.includes("@") && !s.includes(" ")),
          // Query must not contain @ or space.
          fc.string({ maxLength: 20 }).filter((s) => !s.includes(" ") && !s.includes("@")),
          (prefix, query) => {
            const text = prefix + "@" + query;
            const cursorPos = text.length;
            const result = findMentionTrigger(text, cursorPos);
            expect(result).toBe(prefix.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return -1 when space follows @", () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 20 }).filter((s) => !s.includes("@")),
          // Suffix must not contain @ to avoid finding another trigger.
          fc.string({ maxLength: 20 }).filter((s) => !s.includes("@")),
          (prefix, suffix) => {
            const text = prefix + "@ " + suffix;
            const cursorPos = text.length;
            const result = findMentionTrigger(text, cursorPos);
            expect(result).toBe(-1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("getMentionQuery", () => {
    it("should extract query after @", () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 20 }).filter((s) => !s.includes("@") && !s.includes(" ")),
          // Query must not contain @ (which would create another trigger).
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes(" ") && !s.includes("@")),
          (prefix, query) => {
            const text = prefix + "@" + query;
            const cursorPos = text.length;
            const result = getMentionQuery(text, cursorPos);
            expect(result).toBe(query);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("getCommandQuery", () => {
    it("should extract query after /", () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 50 }), (query) => {
          const text = "/" + query;
          const cursorPos = text.length;
          const result = getCommandQuery(text, cursorPos);
          expect(result).toBe(query);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("buildFileMention", () => {
    it("should wrap path in @[[...]]", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (path) => {
          const result = buildFileMention(path);
          expect(result).toBe(`@[[${path}]]`);
          expect(result.startsWith("@[[")).toBe(true);
          expect(result.endsWith("]]")).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should be deterministic", () => {
      fc.assert(
        fc.property(fc.string(), (path) => {
          expect(buildFileMention(path)).toBe(buildFileMention(path));
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("replaceMentionWithFile", () => {
    it("should preserve text before @", () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 20 }).filter((s) => !s.includes("@")),
          fc.string({ minLength: 1, maxLength: 20 }),
          (prefix, filePath) => {
            const text = prefix + "@";
            const cursorPos = text.length;
            const result = replaceMentionWithFile(text, cursorPos, filePath);
            expect(result.newText.startsWith(prefix)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should include the file mention", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 30 }), (filePath) => {
          const result = replaceMentionWithFile("@", 1, filePath);
          expect(result.newText).toContain(`@[[${filePath}]]`);
        }),
        { numRuns: 50 }
      );
    });

    it("cursor should be positioned after the mention", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes("[") && !s.includes("]")),
          (filePath) => {
            const result = replaceMentionWithFile("@", 1, filePath);
            const expectedMention = `@[[${filePath}]]`;
            expect(result.newCursorPosition).toBe(expectedMention.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("buildMessageWithContexts", () => {
    it("should return message unchanged for empty contexts", () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const result = buildMessageWithContexts(message, []);
          expect(result).toBe(message);
        }),
        { numRuns: 100 }
      );
    });

    it("should include all contexts", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
          (message, contexts) => {
            const result = buildMessageWithContexts(message, contexts);
            for (const ctx of contexts) {
              expect(result).toContain(`@[[${ctx}]]`);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should end with the original message", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
          (message, contexts) => {
            const result = buildMessageWithContexts(message, contexts);
            expect(result.endsWith(message)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("filterCommands", () => {
    it("should return subset of input", () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 50 }), (query) => {
          const result = filterCommands(SLASH_COMMANDS, query);
          expect(result.length).toBeLessThanOrEqual(SLASH_COMMANDS.length);
          // All results should be from the original list.
          for (const r of result) {
            expect(SLASH_COMMANDS).toContain(r);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should be case insensitive", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 20 }), (query) => {
          const lowerResult = filterCommands(SLASH_COMMANDS, query.toLowerCase());
          const upperResult = filterCommands(SLASH_COMMANDS, query.toUpperCase());
          expect(lowerResult.length).toBe(upperResult.length);
        }),
        { numRuns: 50 }
      );
    });
  });
});
