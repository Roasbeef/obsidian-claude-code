import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const PLIST_LABEL = "com.anthropic.claude-oauth";
const PLIST_FILENAME = `${PLIST_LABEL}.plist`;

// Get the path to the LaunchAgent plist file.
export function getLaunchAgentPath(): string {
  return path.join(os.homedir(), "Library", "LaunchAgents", PLIST_FILENAME);
}

// Check if the LaunchAgent is already set up.
export function isLaunchAgentSetup(): boolean {
  return fs.existsSync(getLaunchAgentPath());
}

// Check if we're running on macOS.
export function isMacOS(): boolean {
  return process.platform === "darwin";
}

// Generate the plist content for the LaunchAgent.
// Sources both .zshrc and .bashrc to find the token.
function generatePlistContent(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null; launchctl setenv CLAUDE_CODE_OAUTH_TOKEN "$CLAUDE_CODE_OAUTH_TOKEN"</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;
}

// Set up the LaunchAgent to automatically set the OAuth token at login.
// This creates a plist file that runs at every login and sets the
// CLAUDE_CODE_OAUTH_TOKEN environment variable for GUI apps.
export async function setupClaudeOAuthLaunchAgent(): Promise<{ success: boolean; message: string }> {
  if (!isMacOS()) {
    return {
      success: false,
      message: "LaunchAgent setup is only available on macOS",
    };
  }

  const plistPath = getLaunchAgentPath();
  const launchAgentsDir = path.dirname(plistPath);

  try {
    // Ensure LaunchAgents directory exists.
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }

    // Check if already exists.
    if (fs.existsSync(plistPath)) {
      return {
        success: true,
        message: "LaunchAgent is already set up",
      };
    }

    // Write the plist file.
    const plistContent = generatePlistContent();
    fs.writeFileSync(plistPath, plistContent, { mode: 0o644 });

    // Load the LaunchAgent immediately.
    try {
      execSync(`launchctl load "${plistPath}"`, { stdio: "pipe" });
    } catch {
      // May fail if already loaded, that's ok.
    }

    // Run it now to set the env var for current session.
    try {
      execSync(`launchctl start ${PLIST_LABEL}`, { stdio: "pipe" });
    } catch {
      // May fail, that's ok - will work on next login.
    }

    return {
      success: true,
      message: "LaunchAgent created successfully. Please restart Obsidian to apply changes.",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to create LaunchAgent: ${errorMessage}`,
    };
  }
}

// Remove the LaunchAgent if it exists.
export async function removeClaudeOAuthLaunchAgent(): Promise<{ success: boolean; message: string }> {
  if (!isMacOS()) {
    return {
      success: false,
      message: "LaunchAgent removal is only available on macOS",
    };
  }

  const plistPath = getLaunchAgentPath();

  try {
    if (!fs.existsSync(plistPath)) {
      return {
        success: true,
        message: "LaunchAgent was not set up",
      };
    }

    // Unload the LaunchAgent first.
    try {
      execSync(`launchctl unload "${plistPath}"`, { stdio: "pipe" });
    } catch {
      // May fail if not loaded, that's ok.
    }

    // Remove the plist file.
    fs.unlinkSync(plistPath);

    return {
      success: true,
      message: "LaunchAgent removed successfully",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to remove LaunchAgent: ${errorMessage}`,
    };
  }
}

// Get the manual command for users who prefer not to use LaunchAgent.
export function getManualSetupCommand(): string {
  return 'launchctl setenv CLAUDE_CODE_OAUTH_TOKEN "$(echo $CLAUDE_CODE_OAUTH_TOKEN)"';
}
