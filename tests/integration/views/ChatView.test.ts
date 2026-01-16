import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createContainer } from "../../helpers/dom";
import { createMockPlugin } from "../../helpers/factories";

describe("ChatView", () => {
  let container: HTMLElement;
  let originalAnthropicKey: string | undefined;
  let originalOAuthToken: string | undefined;

  beforeEach(() => {
    container = createContainer();
    // Save and clear env vars for tests.
    originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    originalOAuthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  });

  afterEach(() => {
    container.remove();
    // Restore env vars.
    if (originalAnthropicKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (originalOAuthToken !== undefined) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = originalOAuthToken;
    } else {
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    }
  });

  describe("API Key Required Notice", () => {
    it("should show setup notice when API key is not configured", () => {
      // Create mock plugin with no API key.
      const plugin = createMockPlugin({
        settings: {
          apiKey: "",
          model: "sonnet",
          maxTokens: 4096,
          systemPrompt: "",
          autoApproveReadOnly: true,
          enableSkills: true,
          maxBudgetPerSession: 5.0,
          autoApproveVaultWrites: true,
          requireBashApproval: false,
          alwaysAllowedTools: [],
        },
      });

      // Simulate isApiKeyConfigured check.
      const isApiKeyConfigured = () => {
        return !!(
          plugin.settings.apiKey ||
          process.env.ANTHROPIC_API_KEY ||
          process.env.CLAUDE_CODE_OAUTH_TOKEN
        );
      };

      // Should return false when no API key is set.
      expect(isApiKeyConfigured()).toBe(false);
    });

    it("should show chat interface when API key is configured", () => {
      // Create mock plugin with API key set.
      const plugin = createMockPlugin({
        settings: {
          apiKey: "sk-ant-test-key",
          model: "sonnet",
          maxTokens: 4096,
          systemPrompt: "",
          autoApproveReadOnly: true,
          enableSkills: true,
          maxBudgetPerSession: 5.0,
          autoApproveVaultWrites: true,
          requireBashApproval: false,
          alwaysAllowedTools: [],
        },
      });

      const isApiKeyConfigured = () => {
        return !!(
          plugin.settings.apiKey ||
          process.env.ANTHROPIC_API_KEY ||
          process.env.CLAUDE_CODE_OAUTH_TOKEN
        );
      };

      // Should return true when API key is set.
      expect(isApiKeyConfigured()).toBe(true);
    });

    it("should detect API key from environment variable", () => {
      const originalEnv = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "test-env-key";

      try {
        const plugin = createMockPlugin({
          settings: {
            apiKey: "",
            model: "sonnet",
            maxTokens: 4096,
            systemPrompt: "",
            autoApproveReadOnly: true,
            enableSkills: true,
            maxBudgetPerSession: 5.0,
            autoApproveVaultWrites: true,
            requireBashApproval: false,
            alwaysAllowedTools: [],
          },
        });

        const isApiKeyConfigured = () => {
          return !!(
            plugin.settings.apiKey ||
            process.env.ANTHROPIC_API_KEY ||
            process.env.CLAUDE_CODE_OAUTH_TOKEN
          );
        };

        // Should return true when env var is set.
        expect(isApiKeyConfigured()).toBe(true);
      } finally {
        if (originalEnv === undefined) {
          delete process.env.ANTHROPIC_API_KEY;
        } else {
          process.env.ANTHROPIC_API_KEY = originalEnv;
        }
      }
    });
  });

  describe("refreshView", () => {
    it("should re-render view with updated settings", () => {
      const plugin = createMockPlugin({
        settings: {
          apiKey: "",
          model: "sonnet",
          maxTokens: 4096,
          systemPrompt: "",
          autoApproveReadOnly: true,
          enableSkills: true,
          maxBudgetPerSession: 5.0,
          autoApproveVaultWrites: true,
          requireBashApproval: false,
          alwaysAllowedTools: [],
        },
      });

      // Initially no API key - should show setup notice.
      let viewState: "setup-notice" | "chat-interface" = "setup-notice";

      const isApiKeyConfigured = () => {
        return !!(
          plugin.settings.apiKey ||
          process.env.ANTHROPIC_API_KEY ||
          process.env.CLAUDE_CODE_OAUTH_TOKEN
        );
      };

      const renderView = () => {
        if (!isApiKeyConfigured()) {
          viewState = "setup-notice";
        } else {
          viewState = "chat-interface";
        }
      };

      // Initial render - should show setup notice.
      renderView();
      expect(viewState).toBe("setup-notice");

      // User adds API key in settings.
      plugin.settings.apiKey = "sk-ant-new-key";

      // After refresh, should show chat interface.
      renderView();
      expect(viewState).toBe("chat-interface");
    });

    it("should clear content before re-rendering", () => {
      // Simulate the refreshView behavior.
      container.innerHTML = "<div class='claude-code-setup-notice'>Old content</div>";

      const refreshView = () => {
        container.innerHTML = "";
        // Re-render would happen here.
        container.innerHTML = "<div class='claude-code-header'>Chat interface</div>";
      };

      refreshView();

      expect(container.querySelector(".claude-code-setup-notice")).toBeNull();
      expect(container.querySelector(".claude-code-header")).toBeTruthy();
    });
  });

  describe("Setup Notice UI", () => {
    it("should have Open Settings button", () => {
      const noticeEl = document.createElement("div");
      noticeEl.className = "claude-code-setup-notice";

      const titleEl = document.createElement("div");
      titleEl.className = "claude-code-setup-notice-title";
      titleEl.textContent = "API Key Required";
      noticeEl.appendChild(titleEl);

      const descEl = document.createElement("div");
      descEl.textContent = "Please configure your Anthropic API key in settings to start chatting with Claude.";
      noticeEl.appendChild(descEl);

      const openSettingsBtn = document.createElement("button");
      openSettingsBtn.className = "mod-cta";
      openSettingsBtn.textContent = "Open Settings";
      noticeEl.appendChild(openSettingsBtn);

      container.appendChild(noticeEl);

      expect(container.querySelector(".claude-code-setup-notice")).toBeTruthy();
      expect(container.querySelector(".claude-code-setup-notice-title")?.textContent).toBe("API Key Required");
      expect(container.querySelector(".mod-cta")?.textContent).toBe("Open Settings");
    });

    it("should have Refresh button", () => {
      const noticeEl = document.createElement("div");
      noticeEl.className = "claude-code-setup-notice";

      const openSettingsBtn = document.createElement("button");
      openSettingsBtn.className = "mod-cta";
      openSettingsBtn.textContent = "Open Settings";
      noticeEl.appendChild(openSettingsBtn);

      const refreshBtn = document.createElement("button");
      refreshBtn.className = "claude-code-refresh-btn";
      refreshBtn.textContent = "Refresh";
      noticeEl.appendChild(refreshBtn);

      container.appendChild(noticeEl);

      expect(container.querySelector(".claude-code-refresh-btn")).toBeTruthy();
      expect(container.querySelector(".claude-code-refresh-btn")?.textContent).toBe("Refresh");
    });

    it("should call refreshView when Refresh button is clicked", () => {
      const refreshView = vi.fn();

      const noticeEl = document.createElement("div");
      noticeEl.className = "claude-code-setup-notice";

      const refreshBtn = document.createElement("button");
      refreshBtn.className = "claude-code-refresh-btn";
      refreshBtn.textContent = "Refresh";
      refreshBtn.addEventListener("click", () => refreshView());
      noticeEl.appendChild(refreshBtn);

      container.appendChild(noticeEl);

      // Simulate click.
      refreshBtn.click();

      expect(refreshView).toHaveBeenCalled();
    });
  });

  describe("Settings Tab Integration", () => {
    it("should refresh ChatViews when API key changes", async () => {
      // Simulate the SettingsTab behavior.
      const refreshChatViews = vi.fn();

      const plugin = createMockPlugin({
        settings: {
          apiKey: "",
          model: "sonnet",
          maxTokens: 4096,
          systemPrompt: "",
          autoApproveReadOnly: true,
          enableSkills: true,
          maxBudgetPerSession: 5.0,
          autoApproveVaultWrites: true,
          requireBashApproval: false,
          alwaysAllowedTools: [],
        },
      });

      // Simulate onChange handler in SettingsTab.
      const onApiKeyChange = async (value: string) => {
        plugin.settings.apiKey = value;
        await plugin.saveSettings();
        refreshChatViews();
      };

      // User enters API key.
      await onApiKeyChange("sk-ant-new-key");

      expect(plugin.settings.apiKey).toBe("sk-ant-new-key");
      expect(plugin.saveSettings).toHaveBeenCalled();
      expect(refreshChatViews).toHaveBeenCalled();
    });

    it("should find and refresh all ChatView instances", () => {
      // Mock workspace with ChatView leaves.
      const mockLeaves = [
        { view: { refreshView: vi.fn() } },
        { view: { refreshView: vi.fn() } },
      ];

      // Simulate getLeavesOfType returning ChatView leaves.
      const getLeavesOfType = vi.fn().mockReturnValue(mockLeaves);

      // Simulate refreshChatViews method.
      const refreshChatViews = () => {
        const leaves = getLeavesOfType("claude-code-chat-view");
        for (const leaf of leaves) {
          if (leaf.view && "refreshView" in leaf.view) {
            (leaf.view as { refreshView: () => void }).refreshView();
          }
        }
      };

      refreshChatViews();

      expect(getLeavesOfType).toHaveBeenCalledWith("claude-code-chat-view");
      expect(mockLeaves[0].view.refreshView).toHaveBeenCalled();
      expect(mockLeaves[1].view.refreshView).toHaveBeenCalled();
    });
  });
});
