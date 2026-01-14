# obsidian-claude-code

An Obsidian plugin that embeds Claude as an AI assistant using the [Claude Agent SDK](https://github.com/anthropics/claude-code/tree/main/packages/sdk). Claude gets full access to your vault through the same tools available in Claude Code—read, write, search, and execute commands—plus custom Obsidian-specific actions.

<details>
<summary>Screenshot</summary>

![Chat interface showing Claude searching vault](docs/images/chat-interface.png)

</details>

## What It Does

Claude operates as a persistent assistant in your Obsidian sidebar. Ask questions about your notes, request summaries, or have Claude modify files directly. Conversations persist across sessions, and Claude can resume where you left off.

Built on the Claude Agent SDK, the plugin gives Claude access to built-in tools (Read, Write, Edit, Bash, Grep, Glob, WebFetch) plus Obsidian-specific tools for opening files, executing commands, and navigating the workspace. If you have skills defined in `vault/.claude/skills/`, those load automatically too.

This is a desktop-only plugin. The Claude Agent SDK requires Node.js, which is available in Obsidian's Electron environment but not on mobile.

## Requirements

You need an Anthropic API key or a Claude Max subscription. Both work equally well—the subscription option is convenient if you're already paying for Claude.

## Installation

```bash
cd /path/to/your/vault/.obsidian/plugins
git clone https://github.com/Roasbeef/obsidian-claude-code
cd obsidian-claude-code
bun install && bun run build
```

Then enable the plugin: Obsidian Settings → Community Plugins → obsidian-claude-code.

## Authentication

The plugin supports three authentication methods.

**API Key in Settings.** The simplest option. Open Settings → Claude Code and enter your Anthropic API key. The key is stored locally in Obsidian's plugin data directory.

**Environment Variable.** Set `ANTHROPIC_API_KEY` in your shell environment. The plugin reads it automatically.

**Claude Max Subscription.** If you have a Claude Pro or Max subscription, you can use that instead of an API key. Run `claude setup-token` in your terminal to authenticate. This creates a `CLAUDE_CODE_OAUTH_TOKEN` that the plugin detects.

For GUI apps like Obsidian to inherit the token on macOS, add this to your shell profile:

```bash
launchctl setenv CLAUDE_CODE_OAUTH_TOKEN "$(echo $CLAUDE_CODE_OAUTH_TOKEN)"
```

The settings page shows which authentication method is active.

## Usage

Toggle the sidebar with the ribbon icon or `Cmd+Shift+C`. Type your message and press Enter.

Reference specific files using `@[[filename]]` syntax—the input field provides autocomplete when you type `@`. Type `/` for slash commands: `/new` starts a fresh conversation, `/clear` clears history, `/file` adds the active file to context.

When Claude uses tools, the operations appear as collapsible blocks showing what happened and the result. Write operations display a permission modal unless you've enabled auto-approve in settings.

## Tools and Skills

Claude has access to all built-in Claude Code tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, and WebSearch. These handle file operations, code search, and shell commands.

The plugin also exposes Obsidian-specific tools through an MCP server:

- `open_file` — Open a file in the Obsidian editor
- `execute_command` — Run any Obsidian command
- `show_notice` — Display a notification
- `get_active_file` — Get info about the current file
- `list_commands` — Discover available commands
- `create_note` — Create new notes
- `reveal_in_explorer` — Show a file in the file explorer
- `get_vault_stats` — Query vault statistics
- `get_recent_files` — List recently modified files

### Skills

Skills in `vault/.claude/skills/` load automatically. The repository includes a `vault-search` skill you can copy to your vault:

```bash
cp -r skills/vault-search /path/to/vault/.claude/skills/
```

This skill provides semantic search via sqlite-vec embeddings and SQL queries over note frontmatter (a Dataview alternative). See [skills/README.md](skills/README.md) for setup instructions.

See [docs/architecture.md](docs/architecture.md) for full architectural details.

## Data Storage

Conversations are stored in `.obsidian-claude-code/` at your vault root:

```
.obsidian-claude-code/
├── conversations.json    # Metadata index
└── history/
    └── {id}.json         # Full message history per conversation
```

Add this directory to `.gitignore` if you don't want to sync conversation history.

## Development

```bash
bun run dev      # watch mode with rebuild
bun run build    # production build
make check       # typecheck + lint + test
```

Debug logs are written to `~/.obsidian-claude-code/debug.log`.

## License

MIT
