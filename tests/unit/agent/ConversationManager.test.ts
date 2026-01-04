import { describe, it, expect, vi, beforeEach } from "vitest";

// Since generateId and generateTitle are private methods, we test them through
// their public effects or extract testable versions here.

// Test the generateTitle logic by reimplementing it for unit testing.
// The actual implementation is in ConversationManager.ts lines 389-396.
function generateTitle(content: string): string {
  const firstLine = content.split("\n")[0];
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return firstLine.slice(0, 47) + "...";
}

// Test the generateId logic by reimplementing it for unit testing.
// The actual implementation is in ConversationManager.ts lines 384-386.
function generateId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

describe("generateTitle", () => {
  it("should return full content if 50 chars or less", () => {
    const content = "Short title";
    expect(generateTitle(content)).toBe("Short title");
  });

  it("should return exactly 50 char string unchanged", () => {
    const content = "12345678901234567890123456789012345678901234567890"; // 50 chars.
    expect(generateTitle(content)).toBe(content);
    expect(generateTitle(content).length).toBe(50);
  });

  it("should truncate and add ellipsis for content over 50 chars", () => {
    const content = "This is a very long message that should be truncated because it is too long";
    const result = generateTitle(content);
    expect(result).toBe("This is a very long message that should be trun...");
    expect(result.length).toBe(50);
  });

  it("should only use first line for multiline content", () => {
    const content = "First line\nSecond line\nThird line";
    expect(generateTitle(content)).toBe("First line");
  });

  it("should truncate first line if it is too long", () => {
    const content = "This is a very long first line that exceeds fifty characters\nSecond line";
    const result = generateTitle(content);
    expect(result).toBe("This is a very long first line that exceeds fif...");
    expect(result.length).toBe(50);
  });

  it("should handle empty content", () => {
    expect(generateTitle("")).toBe("");
  });

  it("should handle content with only newlines", () => {
    expect(generateTitle("\n\n\n")).toBe("");
  });

  it("should handle unicode content", () => {
    const content = "Hello 🌍 World!";
    expect(generateTitle(content)).toBe("Hello 🌍 World!");
  });

  it("should handle unicode in long content", () => {
    const content = "This is a message with emoji 🎉🎊🎁 that makes it longer than fifty characters";
    const result = generateTitle(content);
    expect(result.length).toBe(50);
    expect(result.endsWith("...")).toBe(true);
  });
});

describe("generateId", () => {
  it("should start with conv- prefix", () => {
    const id = generateId();
    expect(id.startsWith("conv-")).toBe(true);
  });

  it("should contain a timestamp", () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();

    // Extract timestamp from id.
    const parts = id.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(2);

    const timestamp = parseInt(parts[1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it("should contain a random suffix", () => {
    const id = generateId();
    const parts = id.split("-");
    expect(parts.length).toBeGreaterThanOrEqual(3);

    // Random suffix should be alphanumeric.
    const suffix = parts[2];
    expect(suffix).toMatch(/^[a-z0-9]+$/);
  });

  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  it("should match expected format", () => {
    const id = generateId();
    expect(id).toMatch(/^conv-\d+-[a-z0-9]+$/);
  });
});
