import { describe, it, expect } from "vitest";
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

describe("autocomplete utilities", () => {
  describe("SLASH_COMMANDS", () => {
    it("should have the expected commands", () => {
      const commandValues = SLASH_COMMANDS.map((c) => c.value);
      expect(commandValues).toContain("/help");
      expect(commandValues).toContain("/clear");
      expect(commandValues).toContain("/new");
      expect(commandValues).toContain("/file");
      expect(commandValues).toContain("/search");
      expect(commandValues).toContain("/context");
    });

    it("should have type 'command' for all items", () => {
      for (const cmd of SLASH_COMMANDS) {
        expect(cmd.type).toBe("command");
      }
    });

    it("should have descriptions for all commands", () => {
      for (const cmd of SLASH_COMMANDS) {
        expect(cmd.description).toBeDefined();
        expect(cmd.description!.length).toBeGreaterThan(0);
      }
    });

    it("should have icons for all commands", () => {
      for (const cmd of SLASH_COMMANDS) {
        expect(cmd.icon).toBeDefined();
      }
    });
  });

  describe("filterCommands", () => {
    it("should filter by command value", () => {
      const result = filterCommands(SLASH_COMMANDS, "help");
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("/help");
    });

    it("should filter by description", () => {
      const result = filterCommands(SLASH_COMMANDS, "history");
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("/clear");
    });

    it("should be case insensitive", () => {
      const result = filterCommands(SLASH_COMMANDS, "HELP");
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("/help");
    });

    it("should return all commands for empty query", () => {
      const result = filterCommands(SLASH_COMMANDS, "");
      expect(result).toHaveLength(SLASH_COMMANDS.length);
    });

    it("should return empty array for no matches", () => {
      const result = filterCommands(SLASH_COMMANDS, "xyz");
      expect(result).toHaveLength(0);
    });

    it("should match partial values", () => {
      const result = filterCommands(SLASH_COMMANDS, "ea");
      // Should match /clear (description: "Clear conversation history") and /search.
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("nextIndex", () => {
    it("should increment index", () => {
      expect(nextIndex(0, 5)).toBe(1);
      expect(nextIndex(2, 5)).toBe(3);
    });

    it("should wrap around at end", () => {
      expect(nextIndex(4, 5)).toBe(0);
      expect(nextIndex(9, 10)).toBe(0);
    });

    it("should return 0 for empty list", () => {
      expect(nextIndex(0, 0)).toBe(0);
    });

    it("should work with single item", () => {
      expect(nextIndex(0, 1)).toBe(0);
    });
  });

  describe("prevIndex", () => {
    it("should decrement index", () => {
      expect(prevIndex(1, 5)).toBe(0);
      expect(prevIndex(3, 5)).toBe(2);
    });

    it("should wrap around at start", () => {
      expect(prevIndex(0, 5)).toBe(4);
      expect(prevIndex(0, 10)).toBe(9);
    });

    it("should return 0 for empty list", () => {
      expect(prevIndex(0, 0)).toBe(0);
    });

    it("should work with single item", () => {
      expect(prevIndex(0, 1)).toBe(0);
    });
  });

  describe("isCommandTrigger", () => {
    it("should return true for slash prefix", () => {
      expect(isCommandTrigger("/")).toBe(true);
      expect(isCommandTrigger("/help")).toBe(true);
      expect(isCommandTrigger("/partial")).toBe(true);
    });

    it("should return false for non-slash prefix", () => {
      expect(isCommandTrigger("help")).toBe(false);
      expect(isCommandTrigger("@mention")).toBe(false);
      expect(isCommandTrigger("")).toBe(false);
    });
  });

  describe("findMentionTrigger", () => {
    it("should find @ at start", () => {
      expect(findMentionTrigger("@", 1)).toBe(0);
      expect(findMentionTrigger("@file", 5)).toBe(0);
    });

    it("should find @ in middle", () => {
      expect(findMentionTrigger("text @file", 10)).toBe(5);
      expect(findMentionTrigger("hello @", 7)).toBe(6);
    });

    it("should return -1 if no @", () => {
      expect(findMentionTrigger("no mention", 10)).toBe(-1);
      expect(findMentionTrigger("", 0)).toBe(-1);
    });

    it("should return -1 if space after @", () => {
      expect(findMentionTrigger("@ file", 6)).toBe(-1);
      expect(findMentionTrigger("text @ here", 11)).toBe(-1);
    });

    it("should find last @ before cursor", () => {
      expect(findMentionTrigger("@one @two", 9)).toBe(5);
    });
  });

  describe("getMentionQuery", () => {
    it("should return query after @", () => {
      expect(getMentionQuery("@file", 5)).toBe("file");
      expect(getMentionQuery("@not", 4)).toBe("not");
    });

    it("should return partial query at cursor", () => {
      expect(getMentionQuery("@notes", 3)).toBe("no");
    });

    it("should return empty for just @", () => {
      expect(getMentionQuery("@", 1)).toBe("");
    });

    it("should return empty if no @", () => {
      expect(getMentionQuery("no mention", 10)).toBe("");
    });
  });

  describe("getCommandQuery", () => {
    it("should return query after /", () => {
      expect(getCommandQuery("/help", 5)).toBe("help");
      expect(getCommandQuery("/cl", 3)).toBe("cl");
    });

    it("should return partial query at cursor", () => {
      expect(getCommandQuery("/search", 4)).toBe("sea");
    });

    it("should return empty for just /", () => {
      expect(getCommandQuery("/", 1)).toBe("");
    });

    it("should return empty if not a command", () => {
      expect(getCommandQuery("help", 4)).toBe("");
    });
  });

  describe("buildFileMention", () => {
    it("should build wikilink format", () => {
      expect(buildFileMention("notes.md")).toBe("@[[notes.md]]");
      expect(buildFileMention("path/to/file.md")).toBe("@[[path/to/file.md]]");
    });
  });

  describe("replaceMentionWithFile", () => {
    it("should replace @ with file mention", () => {
      const result = replaceMentionWithFile("@", 1, "notes.md");
      expect(result.newText).toBe("@[[notes.md]]");
      expect(result.newCursorPosition).toBe(13);
    });

    it("should replace partial mention", () => {
      const result = replaceMentionWithFile("@not", 4, "notes.md");
      expect(result.newText).toBe("@[[notes.md]]");
    });

    it("should preserve text before @", () => {
      const result = replaceMentionWithFile("hello @", 7, "notes.md");
      expect(result.newText).toBe("hello @[[notes.md]]");
    });

    it("should preserve text after cursor", () => {
      const result = replaceMentionWithFile("@ is here", 1, "notes.md");
      expect(result.newText).toBe("@[[notes.md]] is here");
    });

    it("should append if no @", () => {
      const result = replaceMentionWithFile("hello", 5, "notes.md");
      expect(result.newText).toBe("hello@[[notes.md]]");
    });
  });

  describe("buildMessageWithContexts", () => {
    it("should return message unchanged if no contexts", () => {
      expect(buildMessageWithContexts("hello", [])).toBe("hello");
    });

    it("should prepend single context", () => {
      const result = buildMessageWithContexts("question", ["notes.md"]);
      expect(result).toBe("@[[notes.md]]\n\nquestion");
    });

    it("should prepend multiple contexts", () => {
      const result = buildMessageWithContexts("question", ["a.md", "b.md"]);
      expect(result).toBe("@[[a.md]] @[[b.md]]\n\nquestion");
    });

    it("should handle paths with directories", () => {
      const result = buildMessageWithContexts("q", ["path/to/file.md"]);
      expect(result).toBe("@[[path/to/file.md]]\n\nq");
    });
  });
});
