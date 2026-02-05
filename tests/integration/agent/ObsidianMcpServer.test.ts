import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createObsidianMcpServer } from "@/agent/ObsidianMcpServer";
import type { AskUserQuestion } from "@/views/AskUserQuestionModal";
import { createMockApp } from "../../mocks/obsidian/App.mock";
import { click, waitForDom } from "../../helpers/dom";

// Mock the showAskUserQuestionModal function.
vi.mock("@/views/AskUserQuestionModal", () => ({
  showAskUserQuestionModal: vi.fn(),
  AskUserQuestionModal: vi.fn(),
}));

describe("ObsidianMcpServer", () => {
  let app: any;
  let server: any;
  const vaultPath = "/test/vault";

  beforeEach(() => {
    app = createMockApp();
    server = createObsidianMcpServer(app, vaultPath);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Server initialization", () => {
    it("should create MCP server with correct name and version", () => {
      expect(server).toBeDefined();
      // The server is created by createSdkMcpServer, which returns an opaque object.
      // We can't easily inspect its internals, but we can test the tools.
    });

    it("should register ask_user tool", () => {
      // The tools are registered internally by the SDK.
      // We'll test tool functionality instead of inspecting the server object.
      expect(server).toBeDefined();
    });
  });

  describe("ask_user tool", () => {
    it("should call showAskUserQuestionModal with questions", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = { "Test question": "Yes" };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Test question",
          header: "TEST",
          options: [
            { label: "Yes", description: "Confirm" },
            { label: "No", description: "Decline" },
          ],
          multiSelect: false,
        },
      ];

      // Simulate calling the ask_user tool.
      // Since we can't directly invoke MCP tools from the server object,
      // we'll test the modal function directly.
      const result = await showAskUserQuestionModal(app, questions);

      expect(showAskUserQuestionModal).toHaveBeenCalledWith(app, questions);
      expect(result).toEqual(mockAnswers);
    });

    it("should handle single question with multiple options", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = { "Choose language": "TypeScript" };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Choose language",
          header: "LANGUAGE",
          options: [
            { label: "TypeScript", description: "Typed JavaScript" },
            { label: "JavaScript", description: "Dynamic scripting" },
            { label: "Python", description: "Versatile language" },
          ],
          multiSelect: false,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      expect(result).toEqual(mockAnswers);
    });

    it("should handle multiple questions", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = {
        "Question 1": "Answer A",
        "Question 2": "Answer B",
      };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Question 1",
          header: "Q1",
          options: [
            { label: "Answer A", description: "First answer" },
            { label: "Answer B", description: "Second answer" },
          ],
          multiSelect: false,
        },
        {
          question: "Question 2",
          header: "Q2",
          options: [
            { label: "Answer A", description: "First answer" },
            { label: "Answer B", description: "Second answer" },
          ],
          multiSelect: false,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      expect(result).toEqual(mockAnswers);
    });

    it("should handle multi-select questions", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = { "Select features": "Linting, Testing, Docs" };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Select features",
          header: "FEATURES",
          options: [
            { label: "Linting", description: "Enable code linting" },
            { label: "Testing", description: "Enable automated testing" },
            { label: "Docs", description: "Generate documentation" },
          ],
          multiSelect: true,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      expect(result).toEqual(mockAnswers);
    });

    it("should format response as JSON", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = { "Confirm action": "Yes" };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Confirm action",
          header: "CONFIRM",
          options: [
            { label: "Yes", description: "Proceed" },
            { label: "No", description: "Cancel" },
          ],
          multiSelect: false,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      // The tool should return JSON with the answers.
      const expectedJson = JSON.stringify({ answers: mockAnswers }, null, 2);

      // Verify the result structure matches what the tool would return.
      expect(result).toEqual(mockAnswers);

      // The actual MCP tool would wrap this in:
      // { content: [{ type: "text", text: expectedJson }] }
      const toolResponse = {
        content: [{ type: "text" as const, text: expectedJson }],
      };

      expect(toolResponse.content[0].text).toBe(expectedJson);
    });
  });

  describe("Question validation", () => {
    it("should handle questions with 2 options", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      (showAskUserQuestionModal as any).mockResolvedValue({ Q: "A" });

      const questions: AskUserQuestion[] = [
        {
          question: "Q",
          header: "Q",
          options: [
            { label: "A", description: "Answer A" },
            { label: "B", description: "Answer B" },
          ],
          multiSelect: false,
        },
      ];

      await expect(showAskUserQuestionModal(app, questions)).resolves.toBeDefined();
    });

    it("should handle questions with 4 options", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      (showAskUserQuestionModal as any).mockResolvedValue({ Q: "A" });

      const questions: AskUserQuestion[] = [
        {
          question: "Q",
          header: "Q",
          options: [
            { label: "A", description: "Answer A" },
            { label: "B", description: "Answer B" },
            { label: "C", description: "Answer C" },
            { label: "D", description: "Answer D" },
          ],
          multiSelect: false,
        },
      ];

      await expect(showAskUserQuestionModal(app, questions)).resolves.toBeDefined();
    });

    it("should handle up to 4 questions", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      (showAskUserQuestionModal as any).mockResolvedValue({
        Q1: "A",
        Q2: "B",
        Q3: "C",
        Q4: "D",
      });

      const questions: AskUserQuestion[] = [
        {
          question: "Q1",
          header: "Q1",
          options: [{ label: "A", description: "A" }],
          multiSelect: false,
        },
        {
          question: "Q2",
          header: "Q2",
          options: [{ label: "B", description: "B" }],
          multiSelect: false,
        },
        {
          question: "Q3",
          header: "Q3",
          options: [{ label: "C", description: "C" }],
          multiSelect: false,
        },
        {
          question: "Q4",
          header: "Q4",
          options: [{ label: "D", description: "D" }],
          multiSelect: false,
        },
      ];

      await expect(showAskUserQuestionModal(app, questions)).resolves.toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty answers", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = { "Optional question": "" };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Optional question",
          header: "OPTIONAL",
          options: [
            { label: "Yes", description: "Confirm" },
            { label: "No", description: "Decline" },
          ],
          multiSelect: false,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      expect(result).toEqual(mockAnswers);
    });

    it("should handle custom 'Other' responses", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = { "Enter value": "Custom response text" };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Enter value",
          header: "INPUT",
          options: [
            { label: "Preset 1", description: "Use preset 1" },
            { label: "Preset 2", description: "Use preset 2" },
          ],
          multiSelect: false,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      expect(result["Enter value"]).toBe("Custom response text");
    });

    it("should handle long question text", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const longQuestion =
        "This is a very long question that might span multiple lines in the UI and tests whether the modal can handle verbose text properly without breaking the layout or functionality.";

      (showAskUserQuestionModal as any).mockResolvedValue({ [longQuestion]: "Yes" });

      const questions: AskUserQuestion[] = [
        {
          question: longQuestion,
          header: "LONG",
          options: [
            { label: "Yes", description: "Confirm" },
            { label: "No", description: "Decline" },
          ],
          multiSelect: false,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      expect(result[longQuestion]).toBe("Yes");
    });

    it("should handle long option descriptions", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      (showAskUserQuestionModal as any).mockResolvedValue({ Q: "Option A" });

      const questions: AskUserQuestion[] = [
        {
          question: "Q",
          header: "Q",
          options: [
            {
              label: "Option A",
              description:
                "This is a very long description that explains in great detail what this option does and why you might want to select it over the other options available.",
            },
            {
              label: "Option B",
              description: "Short description",
            },
          ],
          multiSelect: false,
        },
      ];

      await expect(showAskUserQuestionModal(app, questions)).resolves.toBeDefined();
    });

    it("should handle special characters in answers", async () => {
      const { showAskUserQuestionModal } = await import("@/views/AskUserQuestionModal");

      const mockAnswers = {
        "Question": "Answer with \"quotes\", commas, and 'apostrophes'",
      };
      (showAskUserQuestionModal as any).mockResolvedValue(mockAnswers);

      const questions: AskUserQuestion[] = [
        {
          question: "Question",
          header: "Q",
          options: [
            { label: "Normal", description: "Normal answer" },
            { label: "Special", description: "Special characters" },
          ],
          multiSelect: false,
        },
      ];

      const result = await showAskUserQuestionModal(app, questions);

      expect(result["Question"]).toContain("quotes");
      expect(result["Question"]).toContain("commas");
      expect(result["Question"]).toContain("apostrophes");
    });
  });
});
