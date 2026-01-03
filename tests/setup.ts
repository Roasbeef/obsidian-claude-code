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

// Mock Node.js fs for Logger tests.
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    appendFileSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

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
