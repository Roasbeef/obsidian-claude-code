import { vi } from "vitest";

import { MockWorkspaceLeaf } from "./WorkspaceLeaf.mock";

export class MockItemView {
  leaf: MockWorkspaceLeaf;
  contentEl: HTMLElement;
  containerEl: HTMLElement;
  app: any;
  icon: string = "file";

  constructor(leaf: MockWorkspaceLeaf) {
    this.leaf = leaf;
    this.contentEl = document.createElement("div");
    this.contentEl.classList.add("view-content");
    this.containerEl = document.createElement("div");
    this.containerEl.classList.add("view-container");
    this.containerEl.appendChild(this.contentEl);
    this.app = (leaf as any).app;
  }

  getViewType(): string {
    return "mock-view";
  }

  getDisplayText(): string {
    return "Mock View";
  }

  getIcon(): string {
    return this.icon;
  }

  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}

  getState(): any {
    return {};
  }

  async setState(_state: any, _result: any): Promise<void> {}

  load(): void {}
  onload(): void {}
  unload(): void {}
  onunload(): void {}

  addChild<T>(component: T): T {
    return component;
  }

  removeChild(_component: any): void {}

  register(_cb: () => void): void {}

  registerEvent(_eventRef: any): void {}

  registerDomEvent(
    _el: HTMLElement,
    _event: string,
    _callback: (evt: Event) => void
  ): void {}

  registerInterval(_id: number): number {
    return 0;
  }
}

// Export as ItemView for compatibility.
export const ItemView = MockItemView;
