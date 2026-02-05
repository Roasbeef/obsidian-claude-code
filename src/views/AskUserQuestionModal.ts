import { App, Modal } from "obsidian";

// Question structure matching SDK's AskUserQuestion tool.
export interface AskUserQuestion {
  question: string;
  header: string;
  options: { label: string; description: string }[];
  multiSelect: boolean;
}

export class AskUserQuestionModal extends Modal {
  private questions: AskUserQuestion[];
  private answers: Map<number, string[]> = new Map();
  private resolve: (answers: Record<string, string>) => void;
  private otherInputs: Map<number, HTMLInputElement> = new Map();

  constructor(
    app: App,
    questions: AskUserQuestion[],
    onSubmit: (answers: Record<string, string>) => void
  ) {
    super(app);
    this.questions = questions;
    this.resolve = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("claude-code-ask-modal");

    // Title.
    contentEl.createEl("h2", { text: "Claude needs your input" });

    // Render each question.
    for (let i = 0; i < this.questions.length; i++) {
      this.renderQuestion(contentEl, this.questions[i], i);
    }

    // Submit button.
    const buttonContainer = contentEl.createDiv({ cls: "claude-code-ask-buttons" });
    const submitBtn = buttonContainer.createEl("button", {
      cls: "mod-cta",
      text: "Submit",
    });
    submitBtn.addEventListener("click", () => this.submit());
  }

  private renderQuestion(container: HTMLElement, q: AskUserQuestion, index: number) {
    const questionEl = container.createDiv({ cls: "claude-code-question" });

    // Header badge.
    const headerEl = questionEl.createSpan({ cls: "claude-code-question-header" });
    headerEl.setText(q.header);

    // Question text.
    questionEl.createEl("p", { text: q.question, cls: "claude-code-question-text" });

    // Options container.
    const optionsEl = questionEl.createDiv({ cls: "claude-code-question-options" });

    // Render each option.
    for (const opt of q.options) {
      const optBtn = optionsEl.createEl("button", {
        cls: "claude-code-option-btn",
      });

      const labelSpan = optBtn.createSpan({ cls: "claude-code-option-label" });
      labelSpan.setText(opt.label);

      if (opt.description) {
        const descEl = optBtn.createEl("small", { cls: "claude-code-option-desc" });
        descEl.setText(opt.description);
      }

      optBtn.addEventListener("click", () => {
        this.selectOption(index, opt.label, optBtn, optionsEl, q.multiSelect);
      });
    }

    // "Other" option for custom input.
    const otherContainer = questionEl.createDiv({ cls: "claude-code-other-container" });

    const otherBtn = otherContainer.createEl("button", {
      cls: "claude-code-option-btn claude-code-other-btn",
    });
    otherBtn.setText("Other...");

    const otherInput = otherContainer.createEl("input", {
      cls: "claude-code-other-input",
      attr: { type: "text", placeholder: "Enter custom response..." },
    });
    otherInput.style.display = "none";
    this.otherInputs.set(index, otherInput);

    otherBtn.addEventListener("click", () => {
      // Toggle other input visibility.
      const isHidden = otherInput.style.display === "none";
      otherInput.style.display = isHidden ? "block" : "none";
      if (isHidden) {
        otherInput.focus();
        // Clear option selections.
        optionsEl.querySelectorAll(".selected").forEach((el) => el.removeClass("selected"));
        otherBtn.addClass("selected");
      }
    });

    otherInput.addEventListener("input", () => {
      this.answers.set(index, [otherInput.value]);
    });
  }

  private selectOption(
    qIndex: number,
    label: string,
    btn: HTMLElement,
    container: HTMLElement,
    multiSelect: boolean
  ) {
    // Hide other input if visible.
    const otherInput = this.otherInputs.get(qIndex);
    if (otherInput) {
      otherInput.style.display = "none";
    }

    // Find and deselect the "Other" button.
    const questionEl = container.parentElement;
    questionEl?.querySelector(".claude-code-other-btn")?.removeClass("selected");

    if (multiSelect) {
      // Toggle selection for multi-select.
      btn.toggleClass("selected", !btn.hasClass("selected"));
      const currentAnswers = this.answers.get(qIndex) || [];
      if (btn.hasClass("selected")) {
        currentAnswers.push(label);
      } else {
        const idx = currentAnswers.indexOf(label);
        if (idx > -1) currentAnswers.splice(idx, 1);
      }
      this.answers.set(qIndex, currentAnswers);
    } else {
      // Single select - clear previous selection.
      container.querySelectorAll(".selected").forEach((el) => el.removeClass("selected"));
      btn.addClass("selected");
      this.answers.set(qIndex, [label]);
    }
  }

  private submit() {
    const result: Record<string, string> = {};
    for (let i = 0; i < this.questions.length; i++) {
      const q = this.questions[i];
      const answers = this.answers.get(i) || [];
      // Join multiple answers with comma for multi-select.
      result[q.question] = answers.join(", ");
    }
    this.resolve(result);
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Helper function to show the modal and return a promise.
export function showAskUserQuestionModal(
  app: App,
  questions: AskUserQuestion[]
): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const modal = new AskUserQuestionModal(app, questions, resolve);
    modal.open();
  });
}
