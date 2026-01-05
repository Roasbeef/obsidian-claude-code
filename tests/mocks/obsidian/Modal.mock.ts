import { vi } from "vitest";

// Helper to add Obsidian-specific methods to HTMLElement.
function extendElement(el: HTMLElement): HTMLElement {
  // Add Obsidian's addClass method.
  (el as any).addClass = function (className: string) {
    this.classList.add(className);
    return this;
  };

  // Add Obsidian's removeClass method.
  (el as any).removeClass = function (className: string) {
    this.classList.remove(className);
    return this;
  };

  // Add Obsidian's toggleClass method.
  (el as any).toggleClass = function (className: string, force?: boolean) {
    if (force !== undefined) {
      this.classList.toggle(className, force);
    } else {
      this.classList.toggle(className);
    }
    return this;
  };

  // Add Obsidian's hasClass method.
  (el as any).hasClass = function (className: string) {
    return this.classList.contains(className);
  };

  // Add Obsidian's empty method.
  (el as any).empty = function () {
    this.innerHTML = "";
    return this;
  };

  // Add Obsidian's createEl method.
  (el as any).createEl = function (
    tag: string,
    options?: { cls?: string; text?: string; attr?: Record<string, string> }
  ) {
    const child = document.createElement(tag);
    if (options?.cls) {
      child.className = options.cls;
    }
    if (options?.text) {
      child.textContent = options.text;
    }
    if (options?.attr) {
      for (const [key, value] of Object.entries(options.attr)) {
        child.setAttribute(key, value);
      }
    }
    this.appendChild(child);
    return extendElement(child);
  };

  // Add Obsidian's createDiv method.
  (el as any).createDiv = function (options?: {
    cls?: string;
    text?: string;
    attr?: Record<string, string>;
  }) {
    return this.createEl("div", options);
  };

  // Add Obsidian's createSpan method.
  (el as any).createSpan = function (options?: {
    cls?: string;
    text?: string;
    attr?: Record<string, string>;
  }) {
    return this.createEl("span", options);
  };

  // Add Obsidian's setText method.
  (el as any).setText = function (text: string) {
    this.textContent = text;
    return this;
  };

  return el;
}

export class MockModal {
  app: any;
  contentEl: HTMLElement;
  modalEl: HTMLElement;
  containerEl: HTMLElement;
  titleEl: HTMLElement;
  scope: any;
  private isOpen = false;

  constructor(app: any) {
    this.app = app;
    this.contentEl = extendElement(document.createElement("div"));
    this.contentEl.classList.add("modal-content");
    this.modalEl = extendElement(document.createElement("div"));
    this.modalEl.classList.add("modal");
    this.titleEl = extendElement(document.createElement("div"));
    this.titleEl.classList.add("modal-title");
    this.containerEl = extendElement(document.createElement("div"));
    this.containerEl.classList.add("modal-container");
    this.containerEl.appendChild(this.modalEl);
    this.modalEl.appendChild(this.titleEl);
    this.modalEl.appendChild(this.contentEl);
    this.scope = { register: vi.fn() };
  }

  open(): void {
    this.isOpen = true;
    document.body.appendChild(this.containerEl);
    this.onOpen();
  }

  close(): void {
    this.isOpen = false;
    this.onClose();
    this.containerEl.remove();
  }

  onOpen(): void {}
  onClose(): void {}

  setTitle(title: string): this {
    this.titleEl.textContent = title;
    return this;
  }

  // Test helper.
  isOpened(): boolean {
    return this.isOpen;
  }
}

// Export as Modal for compatibility.
export const Modal = MockModal;
