/**
 * Abstraction over Obsidian's vault file system operations.
 * Allows for easy mocking in tests without requiring the full Obsidian API.
 */
export interface IVaultAdapter {
  /**
   * Check if a file or folder exists at the given path.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Read the contents of a file.
   */
  read(path: string): Promise<string>;

  /**
   * Write content to a file, creating it if it doesn't exist.
   */
  write(path: string, content: string): Promise<void>;

  /**
   * Delete a file.
   */
  remove(path: string): Promise<void>;

  /**
   * Create a folder (and parent folders if needed).
   */
  mkdir(path: string): Promise<void>;

  /**
   * Get the base path of the vault on the filesystem.
   */
  getBasePath(): string;

  /**
   * List files in a directory.
   */
  list(path: string): Promise<{ files: string[]; folders: string[] }>;
}
