// TAbstractFile base class.
export class TAbstractFile {
  path: string;
  name: string;
  parent: TFolder | null;
  vault: any;

  constructor(path: string, parent: TFolder | null = null) {
    this.path = path;
    this.name = path.split("/").pop() ?? path;
    this.parent = parent;
    this.vault = null;
  }
}

// TFile class for files.
export class TFile extends TAbstractFile {
  stat: { ctime: number; mtime: number; size: number };
  basename: string;
  extension: string;

  constructor(
    path: string,
    parent: TFolder | null = null,
    stat?: { ctime: number; mtime: number; size: number }
  ) {
    super(path, parent);
    this.stat = stat ?? { ctime: Date.now(), mtime: Date.now(), size: 0 };

    // Extract basename and extension.
    const parts = this.name.split(".");
    if (parts.length > 1) {
      this.extension = parts.pop()!;
      this.basename = parts.join(".");
    } else {
      this.extension = "";
      this.basename = this.name;
    }
  }
}

// TFolder class for folders.
export class TFolder extends TAbstractFile {
  children: TAbstractFile[];
  isRoot: () => boolean;

  constructor(path: string, parent: TFolder | null = null) {
    super(path, parent);
    this.children = [];
    this.isRoot = () => this.path === "/" || this.path === "";
  }
}

// Helper to create a mock file.
export function createMockTFile(
  path: string,
  content?: string
): TFile {
  const file = new TFile(path);
  // Store content in a way tests can access.
  (file as any)._content = content ?? "";
  return file;
}

// Helper to create a mock folder.
export function createMockTFolder(
  path: string,
  children: TAbstractFile[] = []
): TFolder {
  const folder = new TFolder(path);
  folder.children = children;
  children.forEach((child) => (child.parent = folder));
  return folder;
}
