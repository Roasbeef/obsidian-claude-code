import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  hasVaultExtension,
  isRelativePath,
  couldBeVaultPath,
  extractFilePaths,
  normalizeVaultPath,
  getFileName,
  getParentPath,
  pathMatchesQuery,
  VAULT_EXTENSIONS,
} from "../../../src/utils/pathUtils";

describe("pathUtils property tests", () => {
  describe("hasVaultExtension", () => {
    it("should return true for all VAULT_EXTENSIONS", () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 50 }),
          fc.constantFrom(...VAULT_EXTENSIONS),
          (prefix, ext) => {
            const cleanPrefix = prefix.replace(/\./g, "");
            const path = cleanPrefix + ext;
            expect(hasVaultExtension(path)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be case insensitive", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.constantFrom(...VAULT_EXTENSIONS),
          (prefix, ext) => {
            const cleanPrefix = prefix.replace(/\./g, "");
            const lowerPath = cleanPrefix + ext.toLowerCase();
            const upperPath = cleanPrefix + ext.toUpperCase();
            expect(hasVaultExtension(lowerPath)).toBe(hasVaultExtension(upperPath));
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should return false for non-vault extensions", () => {
      const nonVaultExtensions = [".js", ".ts", ".css", ".html", ".json", ".yaml", ".xml"];
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...nonVaultExtensions),
          (prefix, ext) => {
            const cleanPrefix = prefix.replace(/\./g, "");
            expect(hasVaultExtension(cleanPrefix + ext)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("isRelativePath", () => {
    it("should return true for paths with / but no protocol", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes(":") && !s.includes("/")),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes(":") && !s.includes("/")),
          (a, b) => {
            const path = a + "/" + b;
            expect(isRelativePath(path)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return false for URLs with protocols", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("http", "https", "file", "ftp", "ssh"),
          fc.string({ maxLength: 30 }),
          (protocol, rest) => {
            const url = protocol + "://" + rest;
            expect(isRelativePath(url)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("couldBeVaultPath", () => {
    it("should return true for vault extensions", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes(".")),
          fc.constantFrom(...VAULT_EXTENSIONS),
          (name, ext) => {
            expect(couldBeVaultPath(name + ext)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should return true for relative paths", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes(":") && !s.includes("/")),
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes(":") && !s.includes("/")),
          (a, b) => {
            expect(couldBeVaultPath(a + "/" + b)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("extractFilePaths", () => {
    it("should extract paths with valid extensions", () => {
      fc.assert(
        fc.property(
          // Name must start with alphanumeric to match the regex pattern.
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9][a-zA-Z0-9_\-./]*$/.test(s)),
          fc.constantFrom("md", "txt", "pdf", "png"),
          (name, ext) => {
            const path = name + "." + ext;
            const text = "See " + path + " for details";
            const results = extractFilePaths(text);
            expect(results.length).toBeGreaterThanOrEqual(1);
            expect(results.some((r) => r.path === path)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should return empty array for text without file paths", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !/\.[a-z]{2,6}$/i.test(s)),
          (text) => {
            // Only test if text truly has no extensions.
            const noExtension = !VAULT_EXTENSIONS.some((ext) =>
              text.toLowerCase().includes(ext)
            );
            if (noExtension) {
              const results = extractFilePaths(text);
              expect(results).toEqual([]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("normalizeVaultPath", () => {
    it("should be idempotent for typical paths", () => {
      fc.assert(
        fc.property(
          // Use ASCII strings to avoid unicode normalization issues.
          // eslint-disable-next-line no-control-regex
          fc.string({ maxLength: 100 }).filter((s) => /^[\x00-\x7F]*$/.test(s)),
          (path) => {
            const once = normalizeVaultPath(path);
            const twice = normalizeVaultPath(once);
            expect(twice).toBe(once);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should remove leading and trailing slashes", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.startsWith("/") && !s.endsWith("/")),
          fc.nat({ max: 5 }),
          fc.nat({ max: 5 }),
          (content, leadingCount, trailingCount) => {
            const leading = "/".repeat(leadingCount);
            const trailing = "/".repeat(trailingCount);
            const path = leading + content + trailing;
            const result = normalizeVaultPath(path);
            expect(result.startsWith("/")).toBe(false);
            expect(result.endsWith("/")).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should trim whitespace", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.nat({ max: 5 }),
          fc.nat({ max: 5 }),
          (content, leadingSpaces, trailingSpaces) => {
            const leading = " ".repeat(leadingSpaces);
            const trailing = " ".repeat(trailingSpaces);
            const path = leading + content + trailing;
            const result = normalizeVaultPath(path);
            expect(result.startsWith(" ")).toBe(false);
            expect(result.endsWith(" ")).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("getFileName", () => {
    it("should return last segment", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          (segments) => {
            const cleanSegments = segments.map((s) => s.replace(/\//g, "")).filter((s) => s.length > 0);
            if (cleanSegments.length === 0) return;
            const path = cleanSegments.join("/");
            const result = getFileName(path);
            expect(result).toBe(cleanSegments[cleanSegments.length - 1]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty for empty path", () => {
      expect(getFileName("")).toBe("");
    });
  });

  describe("getParentPath", () => {
    it("should return everything except last segment", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
          (segments) => {
            const cleanSegments = segments.map((s) => s.replace(/\//g, "")).filter((s) => s.length > 0);
            if (cleanSegments.length < 2) return;
            const path = cleanSegments.join("/");
            const result = getParentPath(path);
            expect(result).toBe(cleanSegments.slice(0, -1).join("/"));
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty for single segment", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes("/")), (name) => {
          expect(getParentPath(name)).toBe("");
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("pathMatchesQuery", () => {
    it("should always match full path", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (path) => {
          expect(pathMatchesQuery(path, path)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should be case insensitive", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (path, query) => {
            const lowerMatch = pathMatchesQuery(path.toLowerCase(), query);
            const upperMatch = pathMatchesQuery(path.toUpperCase(), query);
            expect(lowerMatch).toBe(upperMatch);
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should match filename", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes("/")),
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => !s.includes("/")),
          (dir, file) => {
            const path = dir + "/" + file;
            expect(pathMatchesQuery(path, file)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
