import { vi } from "vitest";

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
    this.contentEl = document.createElement("div");
    this.contentEl.classList.add("modal-content");
    this.modalEl = document.createElement("div");
    this.modalEl.classList.add("modal");
    this.titleEl = document.createElement("div");
    this.titleEl.classList.add("modal-title");
    this.containerEl = document.createElement("div");
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
