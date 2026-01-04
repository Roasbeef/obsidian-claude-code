import { describe, it, expect } from "vitest";
import {
  VAULT_EXTENSIONS,
  FILE_PATH_PATTERN,
  hasVaultExtension,
  isRelativePath,
  couldBeVaultPath,
  extractFilePaths,
  normalizeVaultPath,
  getFileName,
  getParentPath,
  pathMatchesQuery,
} from "../../../src/utils/pathUtils";

describe("pathUtils utilities", () => {
  describe("VAULT_EXTENSIONS", () => {
    it("should include common vault file extensions", () => {
      expect(VAULT_EXTENSIONS).toContain(".md");
      expect(VAULT_EXTENSIONS).toContain(".txt");
      expect(VAULT_EXTENSIONS).toContain(".pdf");
      expect(VAULT_EXTENSIONS).toContain(".png");
      expect(VAULT_EXTENSIONS).toContain(".jpg");
      expect(VAULT_EXTENSIONS).toContain(".canvas");
    });
  });

  describe("hasVaultExtension", () => {
    it("should return true for markdown files", () => {
      expect(hasVaultExtension("notes.md")).toBe(true);
      expect(hasVaultExtension("path/to/file.md")).toBe(true);
      expect(hasVaultExtension("NOTES.MD")).toBe(true);
    });

    it("should return true for other vault extensions", () => {
      expect(hasVaultExtension("document.txt")).toBe(true);
      expect(hasVaultExtension("report.pdf")).toBe(true);
      expect(hasVaultExtension("image.png")).toBe(true);
      expect(hasVaultExtension("photo.jpg")).toBe(true);
      expect(hasVaultExtension("photo.jpeg")).toBe(true);
      expect(hasVaultExtension("icon.gif")).toBe(true);
      expect(hasVaultExtension("logo.svg")).toBe(true);
      expect(hasVaultExtension("board.canvas")).toBe(true);
    });

    it("should return false for non-vault extensions", () => {
      expect(hasVaultExtension("script.js")).toBe(false);
      expect(hasVaultExtension("style.css")).toBe(false);
      expect(hasVaultExtension("data.json")).toBe(false);
      expect(hasVaultExtension("config.yaml")).toBe(false);
    });

    it("should return false for files without extensions", () => {
      expect(hasVaultExtension("README")).toBe(false);
      expect(hasVaultExtension("Makefile")).toBe(false);
    });
  });

  describe("isRelativePath", () => {
    it("should return true for relative paths", () => {
      expect(isRelativePath("path/to/file")).toBe(true);
      expect(isRelativePath("./file.md")).toBe(true);
      expect(isRelativePath("../parent/file.md")).toBe(true);
      expect(isRelativePath("folder/subfolder/file")).toBe(true);
    });

    it("should return false for URLs", () => {
      expect(isRelativePath("http://example.com")).toBe(false);
      expect(isRelativePath("https://example.com/path")).toBe(false);
      expect(isRelativePath("file://local/path")).toBe(false);
      expect(isRelativePath("data://something")).toBe(false);
    });

    it("should return false for simple filenames", () => {
      expect(isRelativePath("file.md")).toBe(false);
      expect(isRelativePath("document")).toBe(false);
    });

    it("should return false for paths starting with 'http' even without '://'", () => {
      // "httpserver/path" starts with "http", so it's excluded to avoid false positives.
      expect(isRelativePath("httpserver/path")).toBe(false);
    });

    it("should return true for paths with similar prefixes that aren't http", () => {
      expect(isRelativePath("server/path")).toBe(true);
      expect(isRelativePath("myhttp/path")).toBe(true);  // Doesn't START with http.
    });
  });

  describe("couldBeVaultPath", () => {
    it("should return true for vault extensions", () => {
      expect(couldBeVaultPath("notes.md")).toBe(true);
      expect(couldBeVaultPath("image.png")).toBe(true);
    });

    it("should return true for relative paths", () => {
      expect(couldBeVaultPath("path/to/something")).toBe(true);
    });

    it("should return false for URLs", () => {
      expect(couldBeVaultPath("https://example.com")).toBe(false);
    });

    it("should return false for non-matching text", () => {
      expect(couldBeVaultPath("hello world")).toBe(false);
      expect(couldBeVaultPath("script.js")).toBe(false);
    });
  });

  describe("extractFilePaths", () => {
    it("should extract markdown file paths", () => {
      const text = "See notes.md for details";
      const result = extractFilePaths(text);
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe("notes.md");
    });

    it("should extract multiple file paths", () => {
      const text = "Check out pages/intro.md and images/logo.png";
      const result = extractFilePaths(text);
      expect(result).toHaveLength(2);
      expect(result[0].path).toBe("pages/intro.md");
      expect(result[1].path).toBe("images/logo.png");
    });

    it("should include position information", () => {
      const text = "Read file.md now";
      const result = extractFilePaths(text);
      expect(result[0].index).toBe(5);
      expect(result[0].length).toBe(7);
    });

    it("should handle paths with hyphens and underscores", () => {
      const text = "The file my_notes-2024.md is here";
      const result = extractFilePaths(text);
      expect(result[0].path).toBe("my_notes-2024.md");
    });

    it("should return empty array for no matches", () => {
      const text = "No file paths here";
      const result = extractFilePaths(text);
      expect(result).toHaveLength(0);
    });

    it("should extract all supported extensions", () => {
      const text = "Files: a.md, b.txt, c.pdf, d.png, e.jpg, f.jpeg, g.gif, h.svg, i.canvas";
      const result = extractFilePaths(text);
      expect(result.map((r) => r.path)).toEqual([
        "a.md", "b.txt", "c.pdf", "d.png", "e.jpg", "f.jpeg", "g.gif", "h.svg", "i.canvas",
      ]);
    });
  });

  describe("normalizeVaultPath", () => {
    it("should trim whitespace", () => {
      expect(normalizeVaultPath("  path/to/file.md  ")).toBe("path/to/file.md");
    });

    it("should remove leading slashes", () => {
      expect(normalizeVaultPath("/path/to/file.md")).toBe("path/to/file.md");
      expect(normalizeVaultPath("///path/file.md")).toBe("path/file.md");
    });

    it("should remove trailing slashes", () => {
      expect(normalizeVaultPath("path/to/folder/")).toBe("path/to/folder");
      expect(normalizeVaultPath("path/folder///")).toBe("path/folder");
    });

    it("should handle normal paths unchanged", () => {
      expect(normalizeVaultPath("path/to/file.md")).toBe("path/to/file.md");
    });
  });

  describe("getFileName", () => {
    it("should extract filename from path", () => {
      expect(getFileName("path/to/file.md")).toBe("file.md");
      expect(getFileName("folder/document.txt")).toBe("document.txt");
    });

    it("should return filename for simple names", () => {
      expect(getFileName("file.md")).toBe("file.md");
    });

    it("should return empty string for empty path", () => {
      expect(getFileName("")).toBe("");
    });

    it("should handle trailing slash", () => {
      expect(getFileName("path/to/")).toBe("");
    });
  });

  describe("getParentPath", () => {
    it("should extract parent path", () => {
      expect(getParentPath("path/to/file.md")).toBe("path/to");
      expect(getParentPath("folder/subfolder/file.txt")).toBe("folder/subfolder");
    });

    it("should return empty string for single segment", () => {
      expect(getParentPath("file.md")).toBe("");
    });

    it("should return empty string for empty path", () => {
      expect(getParentPath("")).toBe("");
    });

    it("should handle deep paths", () => {
      expect(getParentPath("a/b/c/d/e.md")).toBe("a/b/c/d");
    });
  });

  describe("pathMatchesQuery", () => {
    it("should match full path", () => {
      expect(pathMatchesQuery("path/to/file.md", "path/to")).toBe(true);
      expect(pathMatchesQuery("path/to/file.md", "file.md")).toBe(true);
    });

    it("should match filename only", () => {
      expect(pathMatchesQuery("very/deep/path/notes.md", "notes")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(pathMatchesQuery("Path/To/File.MD", "file")).toBe(true);
      expect(pathMatchesQuery("path/to/file.md", "FILE")).toBe(true);
    });

    it("should return false for no match", () => {
      expect(pathMatchesQuery("path/to/file.md", "other")).toBe(false);
    });

    it("should match partial filename", () => {
      expect(pathMatchesQuery("folder/my-notes-2024.md", "notes")).toBe(true);
    });
  });
});
