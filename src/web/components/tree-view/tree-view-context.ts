import { createContext, useContext } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

export type TreeChildrenState = "loading" | "error" | DirectoryEntry[];

export interface TreeViewContextValue {
  activePath: string;
  expandedPaths: Set<string>;
  childrenByPath: Record<string, TreeChildrenState>;
  onToggle: (path: string) => void;
  onRetry: (path: string) => void;
  onNavigate: (path: string) => void;
  canDropOnPath: (path: string) => boolean;
  onDropEntry: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  availableTags: string[];
  onTagsChange: (path: string, tags: string[]) => void;
}

export const TreeViewContext = createContext<TreeViewContextValue | undefined>(undefined);

export const useTreeViewContext = (): TreeViewContextValue => {
  const context = useContext(TreeViewContext);

  if (!context) {
    throw new Error("useTreeViewContext must be used within a TreeViewContext.Provider");
  }

  return context;
};
