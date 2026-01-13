import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ClaudeCodePlugin from "../main";
import {
  isMacOS,
  isLaunchAgentSetup,
  setupClaudeOAuthLaunchAgent,
  removeClaudeOAuthLaunchAgent,
  getManualSetupCommand,
} from "../utils/launchAgentHelper";

export class ClaudeCodeSettingTab extends PluginSettingTab {
  plugin: ClaudeCodePlugin;

  constructor(app: App, plugin: ClaudeCodePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Claude Code Settings" });

    // API Configuration Section.
    containerEl.createEl("h3", { text: "Authentication" });

    // Check for environment variables.
    const hasEnvApiKey = !!process.env.ANTHROPIC_API_KEY;
    const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;

    if (hasEnvApiKey || hasOAuthToken) {
      const envNotice = containerEl.createDiv({ cls: "claude-code-env-notice" });
      envNotice.createEl("p", {
        text: hasOAuthToken
          ? "Using Claude Max subscription via CLAUDE_CODE_OAUTH_TOKEN environment variable."
          : "Using API key from ANTHROPIC_API_KEY environment variable.",
        cls: "mod-success",
      });
    }

    new Setting(containerEl)
      .setName("API Key")
      .setDesc(
        hasEnvApiKey || hasOAuthToken
          ? "Optional: Override the environment variable with a specific key"
          : "Your Anthropic API key. Get one at console.anthropic.com"
      )
      .addText((text) =>
        text
          .setPlaceholder(hasEnvApiKey ? "(using env var)" : "sk-ant-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      )
      .then((setting) => {
        // Make the input a password field.
        const inputEl = setting.controlEl.querySelector("input");
        if (inputEl) {
          inputEl.type = "password";
        }
      });

    // Claude Max subscription setup section.
    this.renderClaudeMaxSetup(containerEl, hasOAuthToken);

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Claude model to use for conversations")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("sonnet", "Sonnet (Faster)")
          .addOption("opus", "Opus (More capable)")
          .addOption("haiku", "Haiku (Fastest)")
          .setValue(this.plugin.settings.model || "sonnet")
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
          })
      );

    // Permissions Section.
    containerEl.createEl("h3", { text: "Permissions" });

    new Setting(containerEl)
      .setName("Auto-approve vault reads")
      .setDesc("Automatically allow Claude to read files in your vault")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoApproveVaultReads).onChange(async (value) => {
          this.plugin.settings.autoApproveVaultReads = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Auto-approve vault writes")
      .setDesc("Automatically allow Claude to create and edit files in your vault")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoApproveVaultWrites).onChange(async (value) => {
          this.plugin.settings.autoApproveVaultWrites = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Require approval for commands")
      .setDesc("Require explicit approval before executing shell commands")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.requireBashApproval).onChange(async (value) => {
          this.plugin.settings.requireBashApproval = value;
          await this.plugin.saveSettings();
        })
      );

    // Always-allowed tools section.
    if (this.plugin.settings.alwaysAllowedTools.length > 0) {
      const alwaysAllowedEl = containerEl.createDiv({ cls: "claude-code-always-allowed" });
      alwaysAllowedEl.createEl("h4", { text: "Always Allowed Tools" });
      alwaysAllowedEl.createEl("p", {
        text: "These tools have been permanently approved. Click to remove.",
        cls: "setting-item-description",
      });

      const toolsList = alwaysAllowedEl.createDiv({ cls: "claude-code-tools-list" });
      for (const tool of this.plugin.settings.alwaysAllowedTools) {
        const toolChip = toolsList.createDiv({ cls: "claude-code-tool-chip" });
        toolChip.createSpan({ text: tool });
        const removeBtn = toolChip.createEl("button", { text: "×", cls: "claude-code-tool-chip-remove" });
        removeBtn.addEventListener("click", async () => {
          this.plugin.settings.alwaysAllowedTools = this.plugin.settings.alwaysAllowedTools.filter(
            (t) => t !== tool
          );
          await this.plugin.saveSettings();
          this.display(); // Re-render settings.
        });
      }
    }

    // Agent SDK Section.
    containerEl.createEl("h3", { text: "Agent Settings" });

    new Setting(containerEl)
      .setName("Max budget per session")
      .setDesc("Maximum cost in USD before requiring confirmation to continue")
      .addText((text) =>
        text
          .setPlaceholder("10.00")
          .setValue(String(this.plugin.settings.maxBudgetPerSession))
          .onChange(async (value) => {
            const parsed = parseFloat(value);
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.maxBudgetPerSession = parsed;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Max turns per query")
      .setDesc("Maximum conversation turns (tool use cycles) per query")
      .addText((text) =>
        text
          .setPlaceholder("50")
          .setValue(String(this.plugin.settings.maxTurns))
          .onChange(async (value) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed > 0) {
              this.plugin.settings.maxTurns = parsed;
              await this.plugin.saveSettings();
            }
          })
      );

    // About Section.
    containerEl.createEl("h3", { text: "About" });

    const aboutEl = containerEl.createDiv({ cls: "claude-code-settings-about" });
    aboutEl.createEl("p", {
      text: "Claude Code brings AI-powered assistance to your Obsidian vault using the Claude Agent SDK. Ask questions, automate tasks, search notes semantically, and get help with your knowledge base.",
    });
    aboutEl.createEl("p", {
      text: "Features: Built-in tools (Read, Write, Bash, Grep), skill loading from .claude/skills/, Obsidian-specific tools (open files, run commands), and semantic vault search.",
    });
  }

  // Render the Claude Max subscription setup UI.
  private renderClaudeMaxSetup(containerEl: HTMLElement, hasOAuthToken: boolean): void {
    const setupEl = containerEl.createDiv({ cls: "claude-code-claude-max-setup" });

    // If token is already available, show success status.
    if (hasOAuthToken) {
      const successEl = setupEl.createDiv({ cls: "claude-code-setup-success" });
      successEl.createEl("p", {
        text: "Claude Max subscription is active and working.",
        cls: "mod-success",
      });

      // Show option to remove LaunchAgent if it exists.
      if (isMacOS() && isLaunchAgentSetup()) {
        new Setting(setupEl)
          .setName("Automatic login agent")
          .setDesc("A login agent is configured to set your token automatically at login.")
          .addButton((button) =>
            button
              .setButtonText("Remove")
              .setWarning()
              .onClick(async () => {
                const result = await removeClaudeOAuthLaunchAgent();
                new Notice(result.message);
                this.display(); // Re-render.
              })
          );
      }
      return;
    }

    // No token available - show setup instructions.
    setupEl.createEl("details", { attr: { open: "" } }, (details) => {
      details.createEl("summary", { text: "Claude Max Setup (token not detected)" });

      details.createEl("p", {
        text: "To use your Claude Pro/Max subscription instead of an API key:",
      });

      const steps = details.createEl("ol");
      steps.createEl("li", {
        text: "Run 'claude setup-token' in Terminal to authenticate",
      });

      // macOS-specific: Show LaunchAgent setup option.
      if (isMacOS()) {
        const launchAgentSetup = isLaunchAgentSetup();

        if (launchAgentSetup) {
          steps.createEl("li", {
            text: "Login agent is set up - restart Obsidian to apply",
          });
        } else {
          steps.createEl("li").innerHTML =
            "Click <strong>Setup Automatic Login</strong> below, or run manually in Terminal";
        }
        steps.createEl("li", { text: "Restart Obsidian" });

        // Setup button.
        if (!launchAgentSetup) {
          const buttonContainer = details.createDiv({ cls: "claude-code-setup-buttons" });

          const setupBtn = buttonContainer.createEl("button", {
            text: "Setup Automatic Login",
            cls: "mod-cta",
          });
          setupBtn.addEventListener("click", async () => {
            setupBtn.disabled = true;
            setupBtn.textContent = "Setting up...";
            const result = await setupClaudeOAuthLaunchAgent();
            new Notice(result.message);
            this.display(); // Re-render.
          });

          // Explanation of what it does.
          const explainEl = buttonContainer.createDiv({ cls: "claude-code-setup-explain" });
          explainEl.createEl("p", {
            text: "This creates a login agent that automatically makes your token available to GUI apps like Obsidian after each restart.",
            cls: "setting-item-description",
          });
        }

        // Manual command option.
        details.createEl("p", {
          text: "Or run this command manually after each restart:",
          cls: "setting-item-description",
        });
      } else {
        // Non-macOS: Just show the basic steps.
        steps.createEl("li", {
          text: "Set the CLAUDE_CODE_OAUTH_TOKEN environment variable for GUI apps",
        });
        steps.createEl("li", { text: "Restart Obsidian" });

        details.createEl("p", {
          text: "Run this command to make the token available:",
          cls: "setting-item-description",
        });
      }

      // Manual command display with copy button.
      const manualCommand = getManualSetupCommand();
      const codeContainer = details.createDiv({ cls: "claude-code-command-container" });
      const codeEl = codeContainer.createEl("code", {
        text: manualCommand,
        cls: "claude-code-command",
      });

      const copyBtn = codeContainer.createEl("button", {
        text: "Copy",
        cls: "claude-code-copy-btn",
      });
      copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(manualCommand);
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 2000);
      });

      details.createEl("p", {
        text: "Note: If ANTHROPIC_API_KEY is also set, the API key takes precedence.",
        cls: "mod-warning",
      });
    });
  }
}
