import { describe, it, expect } from "vitest";

// Import actual functions from source.
import {
  formatDuration,
  truncateText,
  generateTitle,
  generateId,
  getFilename,
} from "../../../src/utils/formatting";

describe("formatDuration", () => {
  describe("milliseconds (< 1s)", () => {
    it("should format 0ms", () => {
      expect(formatDuration(0)).toBe("0ms");
    });

    it("should format 100ms", () => {
      expect(formatDuration(100)).toBe("100ms");
    });

    it("should format 999ms", () => {
      expect(formatDuration(999)).toBe("999ms");
    });
  });

  describe("seconds (1s - 59s)", () => {
    it("should format 1000ms as 1s", () => {
      expect(formatDuration(1000)).toBe("1s");
    });

    it("should format 1500ms as 1s (floor)", () => {
      expect(formatDuration(1500)).toBe("1s");
    });

    it("should format 30000ms as 30s", () => {
      expect(formatDuration(30000)).toBe("30s");
    });

    it("should format 59999ms as 59s", () => {
      expect(formatDuration(59999)).toBe("59s");
    });
  });

  describe("minutes (60s+)", () => {
    it("should format 60000ms as 1m 0s", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
    });

    it("should format 90000ms as 1m 30s", () => {
      expect(formatDuration(90000)).toBe("1m 30s");
    });

    it("should format 125000ms as 2m 5s", () => {
      expect(formatDuration(125000)).toBe("2m 5s");
    });

    it("should format 3600000ms as 60m 0s", () => {
      expect(formatDuration(3600000)).toBe("60m 0s");
    });
  });
});

describe("truncateText", () => {
  it("should return text unchanged if under limit", () => {
    expect(truncateText("short", 10)).toBe("short");
  });

  it("should return text unchanged if exactly at limit", () => {
    expect(truncateText("1234567890", 10)).toBe("1234567890");
  });

  it("should truncate with ellipsis if over limit", () => {
    expect(truncateText("12345678901", 10)).toBe("1234567...");
  });

  it("should handle empty string", () => {
    expect(truncateText("", 10)).toBe("");
  });

  it("should handle limit of 3", () => {
    expect(truncateText("abcd", 3)).toBe("...");
  });
});

describe("generateTitle", () => {
  it("should return first line unchanged if under 50 chars", () => {
    expect(generateTitle("Short title")).toBe("Short title");
  });

  it("should truncate first line if over 50 chars", () => {
    const longTitle = "This is a very long title that exceeds the fifty character limit";
    const result = generateTitle(longTitle);
    expect(result.length).toBe(50);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should only use first line", () => {
    expect(generateTitle("First line\nSecond line")).toBe("First line");
  });

  it("should handle empty string", () => {
    expect(generateTitle("")).toBe("");
  });

  it("should handle exactly 50 chars", () => {
    const exact50 = "a".repeat(50);
    expect(generateTitle(exact50)).toBe(exact50);
  });

  it("should handle 51 chars", () => {
    const exact51 = "a".repeat(51);
    expect(generateTitle(exact51)).toBe("a".repeat(47) + "...");
  });
});

describe("generateId", () => {
  it("should start with given prefix", () => {
    expect(generateId("msg")).toMatch(/^msg-/);
    expect(generateId("conv")).toMatch(/^conv-/);
  });

  it("should use default prefix if none given", () => {
    expect(generateId()).toMatch(/^id-/);
  });

  it("should contain timestamp", () => {
    const before = Date.now();
    const id = generateId("test");
    const after = Date.now();

    const parts = id.split("-");
    const timestamp = parseInt(parts[1], 10);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it("should match expected format", () => {
    expect(generateId("test")).toMatch(/^test-\d+-[a-z0-9]+$/);
  });
});

describe("getFilename", () => {
  it("should extract filename from path", () => {
    expect(getFilename("/path/to/file.md")).toBe("file.md");
  });

  it("should handle single filename", () => {
    expect(getFilename("file.md")).toBe("file.md");
  });

  it("should handle empty path", () => {
    expect(getFilename("")).toBe("");
  });

  it("should handle path ending with slash", () => {
    expect(getFilename("/path/to/")).toBe("");
  });

  it("should handle deep paths", () => {
    expect(getFilename("/a/b/c/d/e/f.txt")).toBe("f.txt");
  });
});
