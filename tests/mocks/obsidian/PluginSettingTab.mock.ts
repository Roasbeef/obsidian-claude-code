import { vi } from "vitest";

export class MockPluginSettingTab {
  app: any;
  plugin: any;
  containerEl: HTMLElement;

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
    this.containerEl.classList.add("setting-tab");
  }

  display(): void {}

  hide(): void {}
}

// Export as PluginSettingTab for compatibility.
export const PluginSettingTab = MockPluginSettingTab;
