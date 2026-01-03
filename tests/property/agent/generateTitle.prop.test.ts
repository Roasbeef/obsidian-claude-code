import { describe, it, expect } from "vitest";
import fc from "fast-check";

// Import actual function from source.
import { generateTitle } from "../../../src/utils/formatting";

describe("generateTitle property tests", () => {
  it("should never exceed 50 characters", () => {
    fc.assert(
      fc.property(fc.string(), (content) => {
        const title = generateTitle(content);
        expect(title.length).toBeLessThanOrEqual(50);
      }),
      { numRuns: 1000 }
    );
  });

  it("should preserve short content exactly", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 50 }), (content) => {
        // Only test single-line content.
        const singleLine = content.split("\n")[0];
        if (singleLine.length <= 50) {
          const title = generateTitle(singleLine);
          expect(title).toBe(singleLine);
        }
      }),
      { numRuns: 500 }
    );
  });

  it("should end with ... when truncated", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 51 }), (content) => {
        // Ensure first line is long enough.
        const longContent = content.replace(/\n.*/g, "");
        if (longContent.length > 50) {
          const title = generateTitle(longContent);
          expect(title.endsWith("...")).toBe(true);
        }
      }),
      { numRuns: 500 }
    );
  });

  it("should use exactly first line for multiline content", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ maxLength: 50 }),
          fc.array(fc.string(), { minLength: 1, maxLength: 5 })
        ),
        ([firstLine, restLines]) => {
          // Avoid newlines in first line.
          const cleanFirstLine = firstLine.replace(/\n/g, "");
          if (cleanFirstLine.length <= 50) {
            const content = [cleanFirstLine, ...restLines].join("\n");
            const title = generateTitle(content);
            expect(title).toBe(cleanFirstLine);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it("should be deterministic", () => {
    fc.assert(
      fc.property(fc.string(), (content) => {
        const title1 = generateTitle(content);
        const title2 = generateTitle(content);
        expect(title1).toBe(title2);
      }),
      { numRuns: 300 }
    );
  });

  it("should handle unicode correctly", () => {
    fc.assert(
      fc.property(fc.unicodeString(), (content) => {
        const title = generateTitle(content);
        // Note: length check is character count, not byte count.
        expect(title.length).toBeLessThanOrEqual(50);
        // Title should be a valid string.
        expect(typeof title).toBe("string");
      }),
      { numRuns: 300 }
    );
  });

  it("should handle empty and whitespace content", () => {
    fc.assert(
      fc.property(fc.constantFrom("", " ", "  ", "\t", "\n", "\n\n", "   \n   "), (content) => {
        const title = generateTitle(content);
        expect(typeof title).toBe("string");
        expect(title.length).toBeLessThanOrEqual(50);
      }),
      { numRuns: 50 }
    );
  });

  it("should preserve prefix when truncating", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 51, maxLength: 200 }), (content) => {
        const singleLine = content.replace(/\n.*/g, "");
        if (singleLine.length > 50) {
          const title = generateTitle(singleLine);
          const prefix = title.slice(0, 47);
          expect(singleLine.startsWith(prefix)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("should handle strings at the boundary (49, 50, 51 chars)", () => {
    // 49 chars - no truncation.
    const str49 = "a".repeat(49);
    expect(generateTitle(str49)).toBe(str49);
    expect(generateTitle(str49).length).toBe(49);

    // 50 chars - no truncation.
    const str50 = "a".repeat(50);
    expect(generateTitle(str50)).toBe(str50);
    expect(generateTitle(str50).length).toBe(50);

    // 51 chars - truncation.
    const str51 = "a".repeat(51);
    expect(generateTitle(str51)).toBe("a".repeat(47) + "...");
    expect(generateTitle(str51).length).toBe(50);
  });
});
