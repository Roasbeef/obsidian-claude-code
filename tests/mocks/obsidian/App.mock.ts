import { vi } from "vitest";

import { createMockVault, MockVault } from "./Vault.mock";
import { createMockWorkspace, MockWorkspace } from "./Workspace.mock";

export interface MockCommands {
  commands: Record<string, { id: string; name: string }>;
  listCommands: ReturnType<typeof vi.fn>;
  findCommand: ReturnType<typeof vi.fn>;
  executeCommand: ReturnType<typeof vi.fn>;
  executeCommandById: ReturnType<typeof vi.fn>;
}

export interface MockMetadataCache {
  getFileCache: ReturnType<typeof vi.fn>;
  getCache: ReturnType<typeof vi.fn>;
  getFirstLinkpathDest: ReturnType<typeof vi.fn>;
  resolvedLinks: Record<string, Record<string, number>>;
  unresolvedLinks: Record<string, Record<string, number>>;
}

export interface MockApp {
  vault: MockVault;
  workspace: MockWorkspace;
  commands: MockCommands;
  metadataCache: MockMetadataCache;
  keymap: { pushScope: ReturnType<typeof vi.fn>; popScope: ReturnType<typeof vi.fn> };
  scope: { register: ReturnType<typeof vi.fn>; unregister: ReturnType<typeof vi.fn> };
  lastOpenFiles: string[];
}

export function createMockApp(overrides?: Partial<MockApp>): MockApp {
  const vault = overrides?.vault ?? createMockVault();
  const workspace = overrides?.workspace ?? createMockWorkspace();

  return {
    vault,
    workspace,
    commands: {
      commands: {},
      listCommands: vi.fn().mockReturnValue([]),
      findCommand: vi.fn(),
      executeCommand: vi.fn(),
      executeCommandById: vi.fn(),
    },
    metadataCache: {
      getFileCache: vi.fn().mockReturnValue(null),
      getCache: vi.fn().mockReturnValue(null),
      getFirstLinkpathDest: vi.fn().mockReturnValue(null),
      resolvedLinks: {},
      unresolvedLinks: {},
    },
    keymap: {
      pushScope: vi.fn(),
      popScope: vi.fn(),
    },
    scope: {
      register: vi.fn(),
      unregister: vi.fn(),
    },
    lastOpenFiles: [],
    ...overrides,
  };
}
