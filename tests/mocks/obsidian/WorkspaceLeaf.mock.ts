import { vi } from "vitest";

export class MockWorkspaceLeaf {
  view: any = null;
  containerEl: HTMLElement;
  parent: any = null;

  constructor() {
    this.containerEl = document.createElement("div");
    this.containerEl.classList.add("workspace-leaf");
  }

  getViewState(): any {
    return { type: "mock", state: {} };
  }

  async setViewState(state: any): Promise<void> {
    // Set view state mock.
  }

  getDisplayText(): string {
    return "Mock Leaf";
  }

  getIcon(): string {
    return "file";
  }

  openFile = vi.fn();
  open = vi.fn();
  detach = vi.fn();
  setPinned = vi.fn();
  setGroup = vi.fn();
  setDimension = vi.fn();
  togglePinned = vi.fn();
  on = vi.fn();
  off = vi.fn();
  trigger = vi.fn();
}
