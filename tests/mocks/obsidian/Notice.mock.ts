import { vi } from "vitest";

export class MockNotice {
  noticeEl: HTMLElement;
  message: string;
  duration: number;
  private static instances: MockNotice[] = [];

  constructor(message: string, duration?: number) {
    this.message = message;
    this.duration = duration ?? 5000;
    this.noticeEl = document.createElement("div");
    this.noticeEl.classList.add("notice");
    this.noticeEl.textContent = message;
    MockNotice.instances.push(this);

    // Auto-hide after duration (unless duration is 0).
    if (this.duration > 0) {
      setTimeout(() => this.hide(), this.duration);
    }
  }

  setMessage(message: string): this {
    this.message = message;
    this.noticeEl.textContent = message;
    return this;
  }

  hide(): void {
    this.noticeEl.remove();
    const idx = MockNotice.instances.indexOf(this);
    if (idx !== -1) {
      MockNotice.instances.splice(idx, 1);
    }
  }

  // Test helpers.
  static getInstances(): MockNotice[] {
    return MockNotice.instances;
  }

  static clearAll(): void {
    MockNotice.instances.forEach((n) => n.hide());
    MockNotice.instances = [];
  }
}

// Export as Notice for compatibility.
export const Notice = MockNotice;
