import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AskUserQuestionModal, showAskUserQuestionModal } from "@/views/AskUserQuestionModal";
import type { AskUserQuestion } from "@/views/AskUserQuestionModal";
import { createMockApp } from "../../mocks/obsidian/App.mock";
import { click, type as typeText, waitForDom } from "../../helpers/dom";

describe("AskUserQuestionModal", () => {
  let app: any;
  let modal: AskUserQuestionModal;
  let onSubmitCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    app = createMockApp();
    onSubmitCallback = vi.fn();
  });

  afterEach(() => {
    if (modal) {
      modal.onClose();
    }
    document.body.innerHTML = "";
  });

  describe("Modal initialization", () => {
    it("should create modal with single question", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Do you want to proceed?",
          header: "CONFIRM",
          options: [
            { label: "Yes", description: "Proceed with the action" },
            { label: "No", description: "Cancel the action" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      expect(modal).toBeDefined();
      expect(modal.contentEl).toBeDefined();
    });

    it("should create modal with multiple questions", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Which format do you prefer?",
          header: "FORMAT",
          options: [
            { label: "JSON", description: "JavaScript Object Notation" },
            { label: "YAML", description: "YAML Ain't Markup Language" },
          ],
          multiSelect: false,
        },
        {
          question: "Which features do you want?",
          header: "FEATURES",
          options: [
            { label: "Linting", description: "Enable code linting" },
            { label: "Testing", description: "Enable automated testing" },
            { label: "CI/CD", description: "Enable continuous integration" },
          ],
          multiSelect: true,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      expect(modal).toBeDefined();
    });
  });

  describe("Modal rendering", () => {
    it("should render title", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Test question?",
          header: "TEST",
          options: [
            { label: "Option A", description: "First option" },
            { label: "Option B", description: "Second option" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const title = modal.contentEl.querySelector("h2");
      expect(title?.textContent).toBe("Claude needs your input");
    });

    it("should render question with header badge", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Select an option",
          header: "CHOOSE",
          options: [
            { label: "A", description: "Option A" },
            { label: "B", description: "Option B" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const header = modal.contentEl.querySelector(".claude-code-question-header");
      expect(header?.textContent).toBe("CHOOSE");
    });

    it("should render question text", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "What is your preferred language?",
          header: "LANGUAGE",
          options: [
            { label: "TypeScript", description: "Typed superset of JavaScript" },
            { label: "JavaScript", description: "Dynamic scripting language" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const questionText = modal.contentEl.querySelector(".claude-code-question-text");
      expect(questionText?.textContent).toBe("What is your preferred language?");
    });

    it("should render all options", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Choose one",
          header: "OPTION",
          options: [
            { label: "First", description: "The first option" },
            { label: "Second", description: "The second option" },
            { label: "Third", description: "The third option" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      // Count all option buttons including the "Other" button.
      const optionButtons = modal.contentEl.querySelectorAll(".claude-code-option-btn");
      expect(optionButtons.length).toBe(4); // 3 options + 1 "Other" button.
    });

    it("should render option labels and descriptions", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Pick one",
          header: "PICK",
          options: [
            { label: "Fast", description: "Quick but less accurate" },
            { label: "Accurate", description: "Slower but more precise" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const firstOption = modal.contentEl.querySelector(".claude-code-option-btn");
      const label = firstOption?.querySelector(".claude-code-option-label");
      const desc = firstOption?.querySelector(".claude-code-option-desc");

      expect(label?.textContent).toBe("Fast");
      expect(desc?.textContent).toBe("Quick but less accurate");
    });

    it("should render 'Other' option", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Choose",
          header: "CHOOSE",
          options: [
            { label: "A", description: "Option A" },
            { label: "B", description: "Option B" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const otherBtn = modal.contentEl.querySelector(".claude-code-other-btn");
      expect(otherBtn?.textContent).toBe("Other...");
    });

    it("should render submit button", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Test",
          header: "TEST",
          options: [{ label: "Yes", description: "Confirm" }],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const submitBtn = modal.contentEl.querySelector("button.mod-cta");
      expect(submitBtn?.textContent).toBe("Submit");
    });
  });

  describe("Single-select behavior", () => {
    it("should select option when clicked", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Choose one",
          header: "CHOOSE",
          options: [
            { label: "Option 1", description: "First" },
            { label: "Option 2", description: "Second" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const firstOption = modal.contentEl.querySelectorAll(".claude-code-option-btn")[0] as HTMLElement;
      click(firstOption);

      expect(firstOption.classList.contains("selected")).toBe(true);
    });

    it("should deselect previous option when selecting new one (single-select)", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Choose one",
          header: "CHOOSE",
          options: [
            { label: "A", description: "Option A" },
            { label: "B", description: "Option B" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const options = modal.contentEl.querySelectorAll(".claude-code-option-btn");
      const firstOption = options[0] as HTMLElement;
      const secondOption = options[1] as HTMLElement;

      click(firstOption);
      expect(firstOption.classList.contains("selected")).toBe(true);

      click(secondOption);
      expect(firstOption.classList.contains("selected")).toBe(false);
      expect(secondOption.classList.contains("selected")).toBe(true);
    });
  });

  describe("Multi-select behavior", () => {
    it("should allow multiple selections when multiSelect is true", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Select all that apply",
          header: "MULTI",
          options: [
            { label: "A", description: "Option A" },
            { label: "B", description: "Option B" },
            { label: "C", description: "Option C" },
          ],
          multiSelect: true,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const options = modal.contentEl.querySelectorAll(".claude-code-option-btn");
      const firstOption = options[0] as HTMLElement;
      const secondOption = options[1] as HTMLElement;

      click(firstOption);
      click(secondOption);

      expect(firstOption.classList.contains("selected")).toBe(true);
      expect(secondOption.classList.contains("selected")).toBe(true);
    });

    it("should toggle selection in multi-select mode", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Select multiple",
          header: "MULTI",
          options: [
            { label: "X", description: "X option" },
            { label: "Y", description: "Y option" },
          ],
          multiSelect: true,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const firstOption = modal.contentEl.querySelectorAll(".claude-code-option-btn")[0] as HTMLElement;

      click(firstOption);
      expect(firstOption.classList.contains("selected")).toBe(true);

      click(firstOption);
      expect(firstOption.classList.contains("selected")).toBe(false);
    });
  });

  describe("Other option behavior", () => {
    it("should show input field when 'Other' is clicked", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Choose",
          header: "CHOOSE",
          options: [{ label: "Preset", description: "Use preset value" }],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const otherBtn = modal.contentEl.querySelector(".claude-code-other-btn") as HTMLElement;
      const otherInput = modal.contentEl.querySelector(".claude-code-other-input") as HTMLInputElement;

      expect(otherInput.style.display).toBe("none");

      click(otherBtn);

      expect(otherInput.style.display).toBe("block");
    });

    it("should deselect regular options when 'Other' is clicked", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Choose",
          header: "CHOOSE",
          options: [
            { label: "A", description: "Option A" },
            { label: "B", description: "Option B" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const firstOption = modal.contentEl.querySelectorAll(".claude-code-option-btn")[0] as HTMLElement;
      const otherBtn = modal.contentEl.querySelector(".claude-code-other-btn") as HTMLElement;

      click(firstOption);
      expect(firstOption.classList.contains("selected")).toBe(true);

      click(otherBtn);
      expect(firstOption.classList.contains("selected")).toBe(false);
    });

    it("should accept custom text input in 'Other' field", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Enter value",
          header: "INPUT",
          options: [{ label: "Default", description: "Use default" }],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const otherBtn = modal.contentEl.querySelector(".claude-code-other-btn") as HTMLElement;
      const otherInput = modal.contentEl.querySelector(".claude-code-other-input") as HTMLInputElement;

      click(otherBtn);
      typeText(otherInput, "Custom value");

      expect(otherInput.value).toBe("Custom value");
    });
  });

  describe("Submit behavior", () => {
    it("should call onSubmit with selected answers when submit is clicked", async () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Choose one",
          header: "CHOOSE",
          options: [
            { label: "Yes", description: "Confirm" },
            { label: "No", description: "Decline" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const firstOption = modal.contentEl.querySelectorAll(".claude-code-option-btn")[0] as HTMLElement;
      click(firstOption);

      const submitBtn = modal.contentEl.querySelector("button.mod-cta") as HTMLElement;
      click(submitBtn);

      await waitForDom();

      expect(onSubmitCallback).toHaveBeenCalledWith({
        "Choose one": "Yes",
      });
    });

    it("should format multi-select answers as comma-separated", async () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Select features",
          header: "FEATURES",
          options: [
            { label: "Linting", description: "Enable linting" },
            { label: "Testing", description: "Enable testing" },
            { label: "Docs", description: "Enable documentation" },
          ],
          multiSelect: true,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const options = modal.contentEl.querySelectorAll(".claude-code-option-btn");
      click(options[0] as HTMLElement); // Linting
      click(options[2] as HTMLElement); // Docs

      const submitBtn = modal.contentEl.querySelector("button.mod-cta") as HTMLElement;
      click(submitBtn);

      await waitForDom();

      expect(onSubmitCallback).toHaveBeenCalledWith({
        "Select features": "Linting, Docs",
      });
    });

    it("should handle multiple questions", async () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Question 1",
          header: "Q1",
          options: [
            { label: "A1", description: "Answer 1" },
            { label: "A2", description: "Answer 2" },
          ],
          multiSelect: false,
        },
        {
          question: "Question 2",
          header: "Q2",
          options: [
            { label: "B1", description: "Answer B1" },
            { label: "B2", description: "Answer B2" },
          ],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const allOptions = modal.contentEl.querySelectorAll(".claude-code-option-btn");
      // Question 1 has: A1 (0), A2 (1), Other (2)
      // Question 2 has: B1 (3), B2 (4), Other (5)
      click(allOptions[0] as HTMLElement); // First question, first option (A1)
      click(allOptions[3] as HTMLElement); // Second question, first option (B1)

      const submitBtn = modal.contentEl.querySelector("button.mod-cta") as HTMLElement;
      click(submitBtn);

      await waitForDom();

      expect(onSubmitCallback).toHaveBeenCalledWith({
        "Question 1": "A1",
        "Question 2": "B1",
      });
    });

    it("should include 'Other' custom input in results", async () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Enter name",
          header: "NAME",
          options: [{ label: "Default", description: "Use default name" }],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      const otherBtn = modal.contentEl.querySelector(".claude-code-other-btn") as HTMLElement;
      const otherInput = modal.contentEl.querySelector(".claude-code-other-input") as HTMLInputElement;

      click(otherBtn);
      typeText(otherInput, "My Custom Name");

      const submitBtn = modal.contentEl.querySelector("button.mod-cta") as HTMLElement;
      click(submitBtn);

      await waitForDom();

      expect(onSubmitCallback).toHaveBeenCalledWith({
        "Enter name": "My Custom Name",
      });
    });

    it("should handle empty answers", async () => {
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

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      // Don't select anything, just submit.
      const submitBtn = modal.contentEl.querySelector("button.mod-cta") as HTMLElement;
      click(submitBtn);

      await waitForDom();

      expect(onSubmitCallback).toHaveBeenCalledWith({
        "Optional question": "",
      });
    });
  });

  describe("Modal lifecycle", () => {
    it("should clean up content when closed", () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Test",
          header: "TEST",
          options: [{ label: "A", description: "Option A" }],
          multiSelect: false,
        },
      ];

      modal = new AskUserQuestionModal(app, questions, onSubmitCallback);
      modal.open();

      expect(modal.contentEl.children.length).toBeGreaterThan(0);

      modal.onClose();

      expect(modal.contentEl.children.length).toBe(0);
    });
  });

  describe("showAskUserQuestionModal helper", () => {
    it("should return a promise that resolves with answers", async () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Confirm?",
          header: "CONFIRM",
          options: [
            { label: "Yes", description: "Proceed" },
            { label: "No", description: "Cancel" },
          ],
          multiSelect: false,
        },
      ];

      // Start the modal.
      const promise = showAskUserQuestionModal(app, questions);

      // Wait for modal to render.
      await waitForDom(10);

      // Find and click option.
      const modalContent = document.body.querySelector(".modal-content");
      const firstOption = modalContent?.querySelectorAll(".claude-code-option-btn")[0] as HTMLElement;
      click(firstOption);

      // Submit.
      const submitBtn = modalContent?.querySelector("button.mod-cta") as HTMLElement;
      click(submitBtn);

      // Wait for promise to resolve.
      const result = await promise;

      expect(result).toEqual({
        "Confirm?": "Yes",
      });
    });

    it("should create and open modal automatically", async () => {
      const questions: AskUserQuestion[] = [
        {
          question: "Test auto-open",
          header: "TEST",
          options: [{ label: "OK", description: "Confirm" }],
          multiSelect: false,
        },
      ];

      const promise = showAskUserQuestionModal(app, questions);

      await waitForDom(10);

      // Modal should be in the DOM.
      const modalContent = document.body.querySelector(".modal-content");
      expect(modalContent).toBeTruthy();

      // Clean up by submitting.
      const submitBtn = modalContent?.querySelector("button.mod-cta") as HTMLElement;
      click(submitBtn);

      await promise;
    });
  });
});
