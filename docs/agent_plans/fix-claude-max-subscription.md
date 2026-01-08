# Fix: Claude Code Max Subscription Not Working (Issue #6)

## Problem
macOS GUI apps don't inherit shell environment variables. When Obsidian is launched from Dock/Spotlight, `process.env.CLAUDE_CODE_OAUTH_TOKEN` is empty because it's only set in shell sessions (via `~/.zshrc`).

## Solution: Guide users to use `launchctl setenv`

Using `launchctl setenv` is the cleanest and most secure approach:
- Sets env var at macOS session level → GUI apps inherit it
- No token reading/storage in plugin code
- Standard macOS pattern for GUI app environment

### Implementation: Update settings UI with setup instructions

**File:** `src/settings/SettingsTab.ts`

When no OAuth token detected in environment, show clear instructions:

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Max Setup Required                                   │
│                                                             │
│ To use your Claude Max subscription with Obsidian:          │
│                                                             │
│ 1. If you haven't already, run in Terminal:                 │
│    claude setup-token                                       │
│                                                             │
│ 2. Make the token available to GUI apps:                    │
│    launchctl setenv CLAUDE_CODE_OAUTH_TOKEN \               │
│      "$(echo $CLAUDE_CODE_OAUTH_TOKEN)"                     │
│                                                             │
│ 3. Restart Obsidian                                         │
│                                                             │
│ Note: Step 2 needs to be run after each system restart,     │
│ or add it to your login items.                              │
│                                                             │
│ [Copy Command]                                              │
└─────────────────────────────────────────────────────────────┘
```

### Changes

1. **Update settings UI** (`src/settings/SettingsTab.ts`)
   - Detect if OAuth token exists in `process.env.CLAUDE_CODE_OAUTH_TOKEN`
   - If missing and no API key: show setup instructions with copyable command
   - Add "Copy Command" button for the `launchctl setenv` command
   - Show success status when token is detected

2. **No code changes needed for auth logic**
   - Current code already checks `process.env.CLAUDE_CODE_OAUTH_TOKEN`
   - Once user runs `launchctl setenv`, it just works

### Files to Modify
- `src/settings/SettingsTab.ts` - Add setup instructions UI

### Persistent Setup via LaunchAgent (Works Across Restarts)

macOS LaunchAgents run automatically at every login. One-time setup, works forever.

**How it works:**
1. User clicks "Setup Automatic Login" → creates plist
2. On every login (including after restart):
   - macOS auto-loads plist from `~/Library/LaunchAgents/`
   - Runs: `source ~/.zshrc; launchctl setenv CLAUDE_CODE_OAUTH_TOKEN ...`
   - Token is now available to all GUI apps
3. User launches Obsidian → token is in `process.env` ✓

**File:** `~/Library/LaunchAgents/com.anthropic.claude-oauth.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.anthropic.claude-oauth</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>source ~/.zshrc 2>/dev/null; launchctl setenv CLAUDE_CODE_OAUTH_TOKEN "$CLAUDE_CODE_OAUTH_TOKEN"</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

**Plugin can automate this:**
1. Check if plist exists and is loaded
2. If not, offer to create it (with user permission)
3. Use `launchctl load` to activate immediately

**Implementation in settings UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ Claude Max Setup                                            │
│                                                             │
│ Status: ⚠️ Token not available to Obsidian                  │
│                                                             │
│ [Setup Automatic Login]                                     │
│                                                             │
│ This will:                                                  │
│ • Create a login agent that sets your token for GUI apps    │
│ • Works automatically after each restart                    │
│ • Your token stays in your shell profile (secure)           │
│                                                             │
│ Or run manually in Terminal:                                │
│ launchctl setenv CLAUDE_CODE_OAUTH_TOKEN \                  │
│   "$(echo $CLAUDE_CODE_OAUTH_TOKEN)"                        │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Steps

1. **Add LaunchAgent helper** (`src/utils/launchAgentHelper.ts`)
   ```typescript
   export async function setupClaudeOAuthLaunchAgent(): Promise<void> {
     const plistPath = path.join(os.homedir(),
       'Library/LaunchAgents/com.anthropic.claude-oauth.plist');

     // Check if already exists
     if (fs.existsSync(plistPath)) return;

     // Create plist
     const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.anthropic.claude-oauth</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>source ~/.zshrc 2>/dev/null; launchctl setenv CLAUDE_CODE_OAUTH_TOKEN "$CLAUDE_CODE_OAUTH_TOKEN"</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>`;

     fs.writeFileSync(plistPath, plist);

     // Load immediately
     execSync(`launchctl load "${plistPath}"`);

     // Run it now to set the env var
     execSync(`launchctl start com.anthropic.claude-oauth`);
   }

   export function isLaunchAgentSetup(): boolean {
     const plistPath = path.join(os.homedir(),
       'Library/LaunchAgents/com.anthropic.claude-oauth.plist');
     return fs.existsSync(plistPath);
   }
   ```

2. **Update settings UI** (`src/settings/SettingsTab.ts`)
   - Add "Setup Automatic Login" button
   - Show status of LaunchAgent
   - Explain what it does

### Files to Modify
- `src/settings/SettingsTab.ts` - Add setup UI
- `src/utils/launchAgentHelper.ts` (new) - LaunchAgent management

### Security Notes
- Plist only sources shell profile and sets env var - doesn't store token
- Token remains only in `~/.zshrc` (where `claude setup-token` puts it)
- User must explicitly click to create LaunchAgent
