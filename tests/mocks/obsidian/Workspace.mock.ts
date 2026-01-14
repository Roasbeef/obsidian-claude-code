import { vi } from "vitest";

import { MockWorkspaceLeaf } from "./WorkspaceLeaf.mock";

export interface MockWorkspace {
  containerEl: HTMLElement;
  activeLeaf: MockWorkspaceLeaf | null;
  leftSplit: any;
  rightSplit: any;
  rootSplit: any;
  getLeaf: ReturnType<typeof vi.fn>;
  getActiveViewOfType: ReturnType<typeof vi.fn>;
  getActiveFile: ReturnType<typeof vi.fn>;
  getLeavesOfType: ReturnType<typeof vi.fn>;
  getMostRecentLeaf: ReturnType<typeof vi.fn>;
  revealLeaf: ReturnType<typeof vi.fn>;
  detachLeavesOfType: ReturnType<typeof vi.fn>;
  iterateAllLeaves: ReturnType<typeof vi.fn>;
  openLinkText: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  trigger: ReturnType<typeof vi.fn>;
  requestSaveLayout: ReturnType<typeof vi.fn>;
}

export function createMockWorkspace(): MockWorkspace {
  const containerEl = document.createElement("div");
  containerEl.classList.add("workspace");

  const mockLeaf = new MockWorkspaceLeaf();

  return {
    containerEl,
    activeLeaf: mockLeaf,
    leftSplit: { collapsed: false, collapse: vi.fn(), expand: vi.fn() },
    rightSplit: { collapsed: false, collapse: vi.fn(), expand: vi.fn() },
    rootSplit: {},
    getLeaf: vi.fn().mockReturnValue(mockLeaf),
    getActiveViewOfType: vi.fn().mockReturnValue(null),
    getActiveFile: vi.fn().mockReturnValue(null),
    getLeavesOfType: vi.fn().mockReturnValue([]),
    getMostRecentLeaf: vi.fn().mockReturnValue(mockLeaf),
    revealLeaf: vi.fn(),
    detachLeavesOfType: vi.fn(),
    iterateAllLeaves: vi.fn(),
    openLinkText: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    trigger: vi.fn(),
    requestSaveLayout: vi.fn(),
  };
}
