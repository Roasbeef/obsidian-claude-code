import { vi } from "vitest";

// Re-export all mocks as the obsidian module.
export { createMockApp, MockApp } from "./App.mock";
export { createMockVault, MockVault } from "./Vault.mock";
export { createMockWorkspace, MockWorkspace } from "./Workspace.mock";
export { MockWorkspaceLeaf } from "./WorkspaceLeaf.mock";
export { MockItemView, ItemView } from "./ItemView.mock";
export { MockModal, Modal } from "./Modal.mock";
export { MockPluginSettingTab, PluginSettingTab } from "./PluginSettingTab.mock";
export { MockSetting, Setting } from "./Setting.mock";
export { MockNotice, Notice } from "./Notice.mock";
export { TFile, TFolder, TAbstractFile } from "./TFile.mock";
export { MarkdownRenderer } from "./MarkdownRenderer.mock";

// Utility functions that Obsidian exports.
export function setIcon(el: HTMLElement, icon: string): void {
  el.setAttribute("data-icon", icon);
  el.innerHTML = `<svg class="svg-icon lucide-${icon}"></svg>`;
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

// Platform detection.
export const Platform = {
  isDesktop: true,
  isDesktopApp: true,
  isMobile: false,
  isMobileApp: false,
  isIosApp: false,
  isAndroidApp: false,
  isMacOS: true,
  isWin: false,
  isLinux: false,
  isSafari: false,
};

// Plugin class mock.
export class Plugin {
  app: any;
  manifest: any;

  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  async loadData(): Promise<any> {
    return {};
  }

  async saveData(_data: any): Promise<void> {}

  addRibbonIcon(
    _icon: string,
    _title: string,
    _callback: () => void
  ): HTMLElement {
    return document.createElement("div");
  }

  addStatusBarItem(): HTMLElement {
    return document.createElement("div");
  }

  addCommand(_command: any): any {
    return {};
  }

  addSettingTab(_tab: any): void {}

  registerView(_type: string, _viewCreator: any): void {}

  registerExtensions(_extensions: string[], _viewType: string): void {}
}

// Events class mock.
export class Events {
  private handlers: Map<string, Set<(...args: any[]) => void>> = new Map();

  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    this.handlers.get(event)?.delete(callback);
  }

  trigger(event: string, ...args: any[]): void {
    this.handlers.get(event)?.forEach((cb) => cb(...args));
  }

  offref(_ref: any): void {}
}

// Component class mock.
export class Component {
  load(): void {}
  onload(): void {}
  unload(): void {}
  onunload(): void {}

  addChild<T extends Component>(component: T): T {
    return component;
  }

  removeChild(component: Component): void {}

  register(cb: () => void): void {}

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

// App class mock (convenience re-export).
export const App = vi.fn().mockImplementation(() => {
  const { createMockApp } = require("./App.mock");
  return createMockApp();
});
