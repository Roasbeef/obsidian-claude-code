import { vi } from "vitest";

export interface MockAdapter {
  basePath: string;
  exists: ReturnType<typeof vi.fn>;
  read: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  mkdir: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
}

export interface MockVault {
  adapter: MockAdapter;
  configDir: string;
  getRoot: ReturnType<typeof vi.fn>;
  getName: ReturnType<typeof vi.fn>;
  getAbstractFileByPath: ReturnType<typeof vi.fn>;
  getMarkdownFiles: ReturnType<typeof vi.fn>;
  getFiles: ReturnType<typeof vi.fn>;
  getAllLoadedFiles: ReturnType<typeof vi.fn>;
  read: ReturnType<typeof vi.fn>;
  cachedRead: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createFolder: ReturnType<typeof vi.fn>;
  modify: ReturnType<typeof vi.fn>;
  append: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  rename: ReturnType<typeof vi.fn>;
  copy: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  trigger: ReturnType<typeof vi.fn>;
  // In-memory file storage for tests.
  _files: Map<string, string>;
}

export function createMockVault(basePath = "/test/vault"): MockVault {
  const files = new Map<string, string>();

  const adapter: MockAdapter = {
    basePath,
    exists: vi.fn().mockImplementation(async (path: string) => files.has(path)),
    read: vi.fn().mockImplementation(async (path: string) => files.get(path) ?? ""),
    write: vi.fn().mockImplementation(async (path: string, content: string) => {
      files.set(path, content);
    }),
    remove: vi.fn().mockImplementation(async (path: string) => {
      files.delete(path);
    }),
    mkdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ type: "file", ctime: Date.now(), mtime: Date.now(), size: 0 }),
    list: vi.fn().mockResolvedValue({ files: [], folders: [] }),
  };

  return {
    adapter,
    configDir: ".obsidian",
    getRoot: vi.fn().mockReturnValue({ path: "/", name: "vault" }),
    getName: vi.fn().mockReturnValue("test-vault"),
    getAbstractFileByPath: vi.fn().mockReturnValue(null),
    getMarkdownFiles: vi.fn().mockReturnValue([]),
    getFiles: vi.fn().mockReturnValue([]),
    getAllLoadedFiles: vi.fn().mockReturnValue([]),
    read: vi.fn().mockImplementation(async (file: any) => files.get(file.path) ?? ""),
    cachedRead: vi.fn().mockImplementation(async (file: any) => files.get(file.path) ?? ""),
    create: vi.fn().mockImplementation(async (path: string, content: string) => {
      files.set(path, content);
      return { path, name: path.split("/").pop() };
    }),
    createFolder: vi.fn().mockResolvedValue(undefined),
    modify: vi.fn().mockImplementation(async (file: any, content: string) => {
      files.set(file.path, content);
    }),
    append: vi.fn().mockImplementation(async (file: any, content: string) => {
      const existing = files.get(file.path) ?? "";
      files.set(file.path, existing + content);
    }),
    delete: vi.fn().mockImplementation(async (file: any) => {
      files.delete(file.path);
    }),
    rename: vi.fn().mockImplementation(async (file: any, newPath: string) => {
      const content = files.get(file.path);
      if (content !== undefined) {
        files.delete(file.path);
        files.set(newPath, content);
      }
    }),
    copy: vi.fn().mockImplementation(async (file: any, newPath: string) => {
      const content = files.get(file.path);
      if (content !== undefined) {
        files.set(newPath, content);
      }
    }),
    on: vi.fn(),
    off: vi.fn(),
    trigger: vi.fn(),
    _files: files,
  };
}
