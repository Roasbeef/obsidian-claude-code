import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { App, Notice, TFile, TFolder, Command } from "obsidian";
import { execFile } from "child_process";
import { promisify } from "util";
import { showAskUserQuestionModal } from "../views/AskUserQuestionModal";

const execFileAsync = promisify(execFile);

// Type for the MCP server instance.
export type ObsidianMcpServerInstance = ReturnType<typeof createSdkMcpServer>;

// Create the Obsidian MCP server with custom tools.
export function createObsidianMcpServer(
  app: App,
  vaultPath: string
): ObsidianMcpServerInstance {
  return createSdkMcpServer({
    name: "obsidian",
    version: "1.0.0",
    tools: [
      // Open a file in Obsidian's editor view.
      tool(
        "open_file",
        "Open a file in Obsidian's editor view. Use this to show the user a specific note or file.",
        {
          path: z.string().describe("Path to the file relative to vault root"),
          newLeaf: z
            .boolean()
            .optional()
            .describe("Open in a new tab (default: false)"),
          line: z
            .number()
            .optional()
            .describe("Line number to scroll to (optional)"),
        },
        async (args) => {
          const file = app.vault.getAbstractFileByPath(args.path);
          if (file instanceof TFile) {
            const leaf = app.workspace.getLeaf(args.newLeaf ?? false);
            await leaf.openFile(file);

            // Scroll to specific line if provided.
            if (args.line !== undefined) {
              const view = leaf.view;
              if ("editor" in view && view.editor) {
                (view.editor as any).scrollToLine(args.line - 1);
              }
            }

            return {
              content: [
                {
                  type: "text" as const,
                  text: `Opened ${args.path}${
                    args.line ? ` at line ${args.line}` : ""
                  }`,
                },
              ],
            };
          }
          return {
            content: [
              { type: "text" as const, text: `File not found: ${args.path}` },
            ],
          };
        }
      ),

      // Execute an Obsidian command by ID.
      tool(
        "execute_command",
        "Execute an Obsidian command by its ID. Use list_commands to discover available commands. Examples: 'editor:toggle-fold', 'app:open-settings', 'daily-notes:goto-today'.",
        {
          commandId: z.string().describe("The command ID to execute"),
        },
        async (args) => {
          const command = (app as any).commands.findCommand(
            args.commandId
          ) as Command | null;
          if (command) {
            (app as any).commands.executeCommandById(args.commandId);
            return {
              content: [
                { type: "text" as const, text: `Executed: ${command.name}` },
              ],
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: `Command not found: ${args.commandId}. Use list_commands to see available commands.`,
              },
            ],
          };
        }
      ),

      // Show a notice/notification to the user.
      tool(
        "show_notice",
        "Display a notification to the user in Obsidian. Use for confirmations, alerts, or status updates.",
        {
          message: z.string().describe("Message to display to the user"),
          duration: z
            .number()
            .optional()
            .describe("Duration in milliseconds (default: 5000)"),
        },
        async (args) => {
          new Notice(args.message, args.duration ?? 5000);
          return {
            content: [{ type: "text" as const, text: "Notice displayed" }],
          };
        }
      ),

      // Get information about the currently active file.
      tool(
        "get_active_file",
        "Get information about the currently active/open file in Obsidian. Returns path, name, stats, and a preview of content.",
        {},
        async () => {
          const file = app.workspace.getActiveFile();
          if (file) {
            const stat = file.stat;
            const content = await app.vault.read(file);
            const preview =
              content.slice(0, 500) + (content.length > 500 ? "..." : "");

            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      path: file.path,
                      name: file.name,
                      basename: file.basename,
                      extension: file.extension,
                      size: stat.size,
                      created: new Date(stat.ctime).toISOString(),
                      modified: new Date(stat.mtime).toISOString(),
                      preview: preview,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
          return {
            content: [
              { type: "text" as const, text: "No file is currently active" },
            ],
          };
        }
      ),

      // Rebuild the vault search index.
      tool(
        "rebuild_vault_index",
        "Rebuild the semantic search index for the vault. Use when search seems stale or after bulk changes to notes.",
        {
          force: z
            .boolean()
            .optional()
            .describe("Force full rebuild (default: false, incremental)"),
          stats: z
            .boolean()
            .optional()
            .describe("Only show index statistics without rebuilding"),
        },
        async (args) => {
          const pythonPath = `${vaultPath}/.claude/venv/bin/python`;
          const scriptPath = `${vaultPath}/.claude/skills/vault-search/scripts/index.py`;

          const scriptArgs = ["--vault-path", vaultPath];
          if (args.force) scriptArgs.push("--rebuild");
          if (args.stats) scriptArgs.push("--stats");

          try {
            const { stdout, stderr } = await execFileAsync(pythonPath, [
              scriptPath,
              ...scriptArgs,
            ]);
            return {
              content: [{ type: "text" as const, text: stdout || stderr }],
            };
          } catch (error: any) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: ${error.stderr || error.message}`,
                },
              ],
            };
          }
        }
      ),

      // List available Obsidian commands.
      tool(
        "list_commands",
        "List available Obsidian commands. Use this to discover command IDs for execute_command.",
        {
          filter: z
            .string()
            .optional()
            .describe("Filter commands by name (case-insensitive)"),
          limit: z
            .number()
            .optional()
            .describe("Maximum number of commands to return (default: 50)"),
        },
        async (args) => {
          const commands = Object.values(
            (app as any).commands.commands
          ) as Command[];
          let filtered = commands;

          if (args.filter) {
            const f = args.filter.toLowerCase();
            filtered = commands.filter(
              (c: Command) =>
                c.name.toLowerCase().includes(f) || c.id.toLowerCase().includes(f)
            );
          }

          const limit = args.limit ?? 50;
          const list = filtered
            .slice(0, limit)
            .map((c: Command) => `${c.id}: ${c.name}`)
            .join("\n");

          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${filtered.length} commands${
                  filtered.length > limit
                    ? ` (showing first ${limit})`
                    : ""
                }:\n\n${list}`,
              },
            ],
          };
        }
      ),

      // Create a new note with optional template.
      tool(
        "create_note",
        "Create a new note in the vault. Optionally apply a template or specify initial content.",
        {
          path: z
            .string()
            .describe(
              "Path for the new note (e.g., 'folder/note.md'). Creates parent folders if needed."
            ),
          content: z
            .string()
            .optional()
            .describe("Initial content for the note"),
          openAfterCreate: z
            .boolean()
            .optional()
            .describe("Open the note after creating (default: true)"),
        },
        async (args) => {
          // Check if file already exists.
          const existing = app.vault.getAbstractFileByPath(args.path);
          if (existing) {
            return {
              content: [
                { type: "text" as const, text: `File already exists: ${args.path}` },
              ],
            };
          }

          // Create parent folders if needed.
          const folderPath = args.path.substring(
            0,
            args.path.lastIndexOf("/")
          );
          if (folderPath) {
            const folder = app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
              await app.vault.createFolder(folderPath);
            }
          }

          // Create the file.
          const file = await app.vault.create(args.path, args.content || "");

          // Open if requested.
          if (args.openAfterCreate !== false) {
            const leaf = app.workspace.getLeaf(false);
            await leaf.openFile(file);
          }

          return {
            content: [
              { type: "text" as const, text: `Created note: ${args.path}` },
            ],
          };
        }
      ),

      // Navigate to a folder in the file explorer.
      tool(
        "reveal_in_explorer",
        "Reveal a file or folder in Obsidian's file explorer pane.",
        {
          path: z.string().describe("Path to reveal in the file explorer"),
        },
        async (args) => {
          const file = app.vault.getAbstractFileByPath(args.path);
          if (!file) {
            return {
              content: [
                { type: "text" as const, text: `Path not found: ${args.path}` },
              ],
            };
          }

          // Reveal in file explorer.
          const fileExplorer = app.workspace.getLeavesOfType("file-explorer")[0];
          if (fileExplorer) {
            (fileExplorer.view as any).revealInFolder(file);
            return {
              content: [
                { type: "text" as const, text: `Revealed in explorer: ${args.path}` },
              ],
            };
          }

          return {
            content: [
              { type: "text" as const, text: "File explorer not found" },
            ],
          };
        }
      ),

      // Get vault statistics.
      tool(
        "get_vault_stats",
        "Get statistics about the vault: total files, folders, note count, etc.",
        {},
        async () => {
          const files = app.vault.getFiles();
          const markdownFiles = app.vault.getMarkdownFiles();
          const folders = new Set<string>();

          for (const file of files) {
            const parts = file.path.split("/");
            for (let i = 1; i < parts.length; i++) {
              folders.add(parts.slice(0, i).join("/"));
            }
          }

          const stats = {
            totalFiles: files.length,
            markdownNotes: markdownFiles.length,
            otherFiles: files.length - markdownFiles.length,
            totalFolders: folders.size,
            vaultPath: vaultPath,
          };

          return {
            content: [
              { type: "text" as const, text: JSON.stringify(stats, null, 2) },
            ],
          };
        }
      ),

      // Get recently modified files.
      tool(
        "get_recent_files",
        "Get a list of recently modified files in the vault.",
        {
          limit: z
            .number()
            .optional()
            .describe("Maximum number of files to return (default: 10)"),
          folder: z
            .string()
            .optional()
            .describe("Filter to files in this folder"),
        },
        async (args) => {
          let files = app.vault.getMarkdownFiles();

          // Filter by folder if specified.
          if (args.folder) {
            files = files.filter((f) => f.path.startsWith(args.folder!));
          }

          // Sort by modification time.
          files.sort((a, b) => b.stat.mtime - a.stat.mtime);

          const limit = args.limit ?? 10;
          const recent = files.slice(0, limit).map((f) => ({
            path: f.path,
            name: f.name,
            modified: new Date(f.stat.mtime).toISOString(),
          }));

          return {
            content: [
              { type: "text" as const, text: JSON.stringify(recent, null, 2) },
            ],
          };
        }
      ),

      // Ask the user questions with multiple choice options.
      tool(
        "ask_user",
        "Show a modal dialog to ask the user questions with multiple choice options. Use this when you need user input, clarification, or preferences. The user will see an interactive dialog and can select from the provided options.",
        {
          questions: z.array(z.object({
            question: z.string().describe("The question to ask the user"),
            header: z.string().describe("Short label for the question (max 12 characters, e.g., 'PREFERENCE', 'CHOOSE')"),
            options: z.array(z.object({
              label: z.string().describe("Option label (short, e.g., 'Yes', 'Create new file', 'Option A')"),
              description: z.string().describe("Brief description of what this option means"),
            })).describe("2-4 options for the user to choose from"),
            multiSelect: z.boolean().describe("Whether the user can select multiple options (true) or just one (false)"),
          })).min(1).max(4).describe("1-4 questions to ask the user in a single dialog"),
        },
        async (args) => {
          const answers = await showAskUserQuestionModal(app, args.questions);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ answers }, null, 2),
              },
            ],
          };
        }
      ),
    ],
  });
}
