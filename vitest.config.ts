import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Test environment - happy-dom for fast DOM testing.
    environment: "happy-dom",

    // Global setup file.
    setupFiles: ["./tests/setup.ts"],

    // Include patterns.
    include: ["tests/**/*.test.ts"],

    // Coverage configuration.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/main.ts", // Plugin entry point has Obsidian-specific lifecycle.
        "src/types.ts", // Type definitions only, no executable code.
        // Views are tightly coupled to Obsidian DOM extensions (createDiv, addClass, etc.).
        // Testable logic has been extracted to src/utils/.
        "src/views/**/*.ts",
        // Settings tab requires Obsidian's Setting UI components.
        "src/settings/**/*.ts",
        // AgentController is primarily SDK integration code.
        // Pure functions like classifyError() are exported and tested separately.
        // Remaining code requires complex async iterator mocking of SDK query().
        "src/agent/AgentController.ts",
        // MCP server requires Obsidian vault access.
        "src/agent/ObsidianMcpServer.ts",
        // Interface definitions have no executable code.
        "src/interfaces/**/*.ts",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Parallelization.
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },

    // Timeouts.
    testTimeout: 10000,
    hookTimeout: 10000,

    // Path aliases - map obsidian to our mock.
    alias: {
      "@/": path.resolve(__dirname, "./src/"),
      obsidian: path.resolve(__dirname, "./tests/mocks/obsidian/index.ts"),
    },

    // Globals (describe, it, expect without imports).
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
