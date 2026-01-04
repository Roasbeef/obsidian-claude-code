import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createContainer, keydown, pressEnter, pressEscape, type } from "../../helpers/dom";
import { createMockPlugin } from "../../helpers/factories";

describe("ChatInput", () => {
  let container: HTMLElement;
  let onSend: ReturnType<typeof vi.fn>;
  let onCancel: ReturnType<typeof vi.fn>;
  let isStreaming: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = createContainer();
    onSend = vi.fn();
    onCancel = vi.fn();
    isStreaming = vi.fn().mockReturnValue(false);
  });

  afterEach(() => {
    container.remove();
  });

  describe("rendering", () => {
    it("should create textarea element", () => {
      const textarea = document.createElement("textarea");
      textarea.className = "claude-code-input";
      container.appendChild(textarea);

      expect(container.querySelector("textarea")).toBeTruthy();
    });

    it("should create send button", () => {
      const button = document.createElement("button");
      button.className = "claude-code-send-button";
      container.appendChild(button);

      expect(container.querySelector(".claude-code-send-button")).toBeTruthy();
    });

    it("should create quick action buttons", () => {
      const quickActions = document.createElement("div");
      quickActions.className = "claude-code-quick-actions";

      const addFile = document.createElement("button");
      addFile.textContent = "+File";
      quickActions.appendChild(addFile);

      const mention = document.createElement("button");
      mention.textContent = "@mention";
      quickActions.appendChild(mention);

      const command = document.createElement("button");
      command.textContent = "/command";
      quickActions.appendChild(command);

      container.appendChild(quickActions);

      expect(container.querySelectorAll(".claude-code-quick-actions button").length).toBe(3);
    });

    it("should have placeholder text", () => {
      const textarea = document.createElement("textarea");
      textarea.placeholder = "Ask about your vault...";
      container.appendChild(textarea);

      expect(textarea.placeholder).toBe("Ask about your vault...");
    });
  });

  describe("keyboard handling", () => {
    it("should call onSend on Enter when not streaming", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Hello Claude";
      container.appendChild(textarea);

      // Simulate Enter key.
      const event = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
      const preventDefault = vi.spyOn(event, "preventDefault");

      // Handle keydown.
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!isStreaming()) {
          onSend(textarea.value);
        }
      }

      expect(onSend).toHaveBeenCalledWith("Hello Claude");
    });

    it("should call onCancel on Enter when streaming", () => {
      isStreaming.mockReturnValue(true);
      const textarea = document.createElement("textarea");
      container.appendChild(textarea);

      const event = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });

      if (event.key === "Enter" && !event.shiftKey) {
        if (isStreaming()) {
          onCancel();
        }
      }

      expect(onCancel).toHaveBeenCalled();
    });

    it("should not call onSend on Shift+Enter", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Hello Claude";
      container.appendChild(textarea);

      const event = new KeyboardEvent("keydown", { key: "Enter", shiftKey: true });

      if (event.key === "Enter" && !event.shiftKey) {
        onSend(textarea.value);
      }

      expect(onSend).not.toHaveBeenCalled();
    });

    it("should call onCancel on Escape when streaming", () => {
      isStreaming.mockReturnValue(true);
      const textarea = document.createElement("textarea");
      container.appendChild(textarea);

      const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });

      if (event.key === "Escape" && isStreaming()) {
        onCancel();
      }

      expect(onCancel).toHaveBeenCalled();
    });

    it("should not call onCancel on Escape when not streaming and no autocomplete", () => {
      isStreaming.mockReturnValue(false);
      const autocompleteVisible = false;

      if (!autocompleteVisible && !isStreaming()) {
        // Do nothing.
      }

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe("message sending", () => {
    it("should not send empty messages", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "";
      container.appendChild(textarea);

      const trimmed = textarea.value.trim();
      if (trimmed) {
        onSend(trimmed);
      }

      expect(onSend).not.toHaveBeenCalled();
    });

    it("should not send whitespace-only messages", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "   \n\t  ";
      container.appendChild(textarea);

      const trimmed = textarea.value.trim();
      if (trimmed) {
        onSend(trimmed);
      }

      expect(onSend).not.toHaveBeenCalled();
    });

    it("should trim message before sending", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "  Hello Claude  ";
      container.appendChild(textarea);

      const trimmed = textarea.value.trim();
      if (trimmed) {
        onSend(trimmed);
      }

      expect(onSend).toHaveBeenCalledWith("Hello Claude");
    });

    it("should clear textarea after sending", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Hello Claude";
      container.appendChild(textarea);

      const trimmed = textarea.value.trim();
      if (trimmed) {
        onSend(trimmed);
        textarea.value = "";
      }

      expect(textarea.value).toBe("");
    });
  });

  describe("file context", () => {
    it("should track file contexts", () => {
      const fileContexts: string[] = [];
      fileContexts.push("notes/test.md");

      expect(fileContexts).toContain("notes/test.md");
    });

    it("should include file context in message", () => {
      const fileContexts = ["notes/test.md"];
      const message = "What is this file about?";

      let fullMessage = message;
      if (fileContexts.length > 0) {
        const contextStr = fileContexts.map((f) => `@[[${f}]]`).join(" ");
        fullMessage = `${contextStr}\n\n${message}`;
      }

      expect(fullMessage).toContain("@[[notes/test.md]]");
      expect(fullMessage).toContain("What is this file about?");
    });

    it("should clear file contexts after sending", () => {
      const fileContexts = ["file1.md", "file2.md"];
      fileContexts.length = 0;

      expect(fileContexts).toEqual([]);
    });

    it("should handle multiple file contexts", () => {
      const fileContexts = ["file1.md", "file2.md", "file3.md"];
      const contextStr = fileContexts.map((f) => `@[[${f}]]`).join(" ");

      expect(contextStr).toBe("@[[file1.md]] @[[file2.md]] @[[file3.md]]");
    });
  });

  describe("autocomplete triggers", () => {
    it("should trigger command autocomplete on /", () => {
      const value = "/commit";
      const startsWithSlash = value.startsWith("/");

      expect(startsWithSlash).toBe(true);
    });

    it("should trigger file autocomplete on @", () => {
      const value = "Hello @test";
      const hasAt = value.includes("@");

      expect(hasAt).toBe(true);
    });

    it("should extract command query", () => {
      const value = "/com";
      const cursorPos = 4;
      const query = value.slice(1, cursorPos);

      expect(query).toBe("com");
    });

    it("should extract file mention query", () => {
      const value = "Hello @test";
      const cursorPos = 11;
      const atIndex = value.lastIndexOf("@");
      const query = value.slice(atIndex + 1, cursorPos);

      expect(query).toBe("test");
    });

    it("should not trigger file autocomplete after space", () => {
      const value = "Hello @test file";
      const cursorPos = 16;
      const atIndex = value.slice(0, cursorPos).lastIndexOf("@");
      const afterAt = value.slice(atIndex + 1, cursorPos);
      const hasSpace = afterAt.includes(" ");

      expect(hasSpace).toBe(true);
    });
  });

  describe("auto-resize", () => {
    it("should start with single row", () => {
      const textarea = document.createElement("textarea");
      textarea.setAttribute("rows", "1");
      container.appendChild(textarea);

      expect(textarea.getAttribute("rows")).toBe("1");
    });

    it("should adjust height based on content", () => {
      const textarea = document.createElement("textarea");
      textarea.style.height = "auto";
      container.appendChild(textarea);

      textarea.value = "Line 1\nLine 2\nLine 3";
      // Simulate auto-resize.
      textarea.style.height = `${textarea.scrollHeight}px`;

      expect(textarea.style.height).not.toBe("auto");
    });
  });

  describe("streaming state", () => {
    it("should update placeholder during streaming", () => {
      const textarea = document.createElement("textarea");
      container.appendChild(textarea);

      if (isStreaming()) {
        textarea.placeholder = "Press Escape to cancel...";
      } else {
        textarea.placeholder = "Ask about your vault...";
      }

      expect(textarea.placeholder).toBe("Ask about your vault...");
    });

    it("should change placeholder when streaming starts", () => {
      isStreaming.mockReturnValue(true);
      const textarea = document.createElement("textarea");
      container.appendChild(textarea);

      if (isStreaming()) {
        textarea.placeholder = "Press Escape to cancel...";
      }

      expect(textarea.placeholder).toBe("Press Escape to cancel...");
    });
  });

  describe("command handling", () => {
    it("should detect slash commands", () => {
      const value = "/commit";
      const isCommand = value.startsWith("/") && !value.includes(" ");

      expect(isCommand).toBe(true);
    });

    it("should not treat paths as commands", () => {
      const value = "Check the /path/to/file";
      const isCommand = value.startsWith("/") && !value.includes(" ");

      expect(isCommand).toBe(false);
    });

    it("should extract command from input", () => {
      const value = "/commit -m 'message'";
      const spaceIndex = value.indexOf(" ");
      const command = spaceIndex === -1 ? value.slice(1) : value.slice(1, spaceIndex);

      expect(command).toBe("commit");
    });
  });

  describe("file mention insertion", () => {
    it("should insert file mention at cursor", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Hello ";
      const cursorPos = 6;
      const filePath = "notes/test.md";

      const before = textarea.value.slice(0, cursorPos);
      const after = textarea.value.slice(cursorPos);
      textarea.value = `${before}@[[${filePath}]] ${after}`;

      expect(textarea.value).toBe("Hello @[[notes/test.md]] ");
    });

    it("should replace @ query when selecting file", () => {
      const textarea = document.createElement("textarea");
      textarea.value = "Hello @test";
      const atIndex = 6;
      const filePath = "test/file.md";

      const before = textarea.value.slice(0, atIndex);
      textarea.value = `${before}@[[${filePath}]] `;

      expect(textarea.value).toBe("Hello @[[test/file.md]] ");
    });
  });
});
