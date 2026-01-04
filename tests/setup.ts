import { beforeAll, afterEach, vi } from "vitest";

// Mock Obsidian globally before any imports.
vi.mock("obsidian", async () => {
  const mocks = await import("./mocks/obsidian/index");
  return mocks;
});

// Mock Claude Agent SDK.
vi.mock("@anthropic-ai/claude-agent-sdk", async () => {
  const mocks = await import("./mocks/claude-sdk/index");
  return mocks;
});

// Note: fs is NOT mocked globally - tests that need fs mocks should
// set them up locally. This allows AgentController to use real fs.existsSync
// for Claude CLI detection.

beforeAll(() => {
  // Setup global DOM environment if needed.
  // happy-dom provides document, window, etc.
});

afterEach(() => {
  // Clean up DOM after each test.
  document.body.innerHTML = "";

  // Clear all mocks.
  vi.clearAllMocks();
});
