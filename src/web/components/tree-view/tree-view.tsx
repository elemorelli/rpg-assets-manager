import type { DragEvent, JSX } from "react";

import { Button } from "#components/button/button.tsx";
import { joinRelativePath } from "#utils/paths.ts";
import { ROOT_PATH } from "#web/utils/breadcrumbs.ts";

import { TreeNode } from "./tree-node.tsx";
import { TreeViewContext } from "./tree-view-context.ts";
import styles from "./tree-view.module.css";
import { useTreeData } from "./use-tree-data.ts";

export interface TreeViewProps {
  activePath: string;
  refreshToken: number;
  onNavigate: (path: string) => void;
  canDropOnPath: (path: string) => boolean;
  onDropEntry: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  availableTags: string[];
  onTagsChange: (path: string, tags: string[]) => void;
}

export const TreeView = ({
  activePath,
  refreshToken,
  onNavigate,
  canDropOnPath,
  onDropEntry,
  onRename,
  onDelete,
  availableTags,
  onTagsChange,
}: TreeViewProps): JSX.Element => {
  const { expandedPaths, childrenByPath, handleToggle, handleRetry } = useTreeData(
    activePath,
    refreshToken,
  );

  const handleRootDragOver = (event: DragEvent<HTMLUListElement>): void => {
    if (!canDropOnPath(ROOT_PATH)) {
      return;
    }

    event.preventDefault();
  };

  const handleRootDrop = (event: DragEvent<HTMLUListElement>): void => {
    if (!canDropOnPath(ROOT_PATH)) {
      return;
    }

    event.preventDefault();
    onDropEntry(ROOT_PATH);
  };

  const rootState = childrenByPath[ROOT_PATH];

  return (
    <TreeViewContext.Provider
      value={{
        activePath,
        expandedPaths,
        childrenByPath,
        onToggle: handleToggle,
        onRetry: handleRetry,
        onNavigate,
        canDropOnPath,
        onDropEntry,
        onRename,
        onDelete,
        availableTags,
        onTagsChange,
      }}>
      <ul className={styles.tree} onDragOver={handleRootDragOver} onDrop={handleRootDrop}>
        {rootState === "error" && (
          <li className={styles.error}>
            Failed to load.{" "}
            <Button variant="secondary" onClick={() => handleRetry(ROOT_PATH)}>
              Retry
            </Button>
          </li>
        )}
        {Array.isArray(rootState) &&
          rootState.map((child) => (
            <TreeNode
              key={child.name}
              path={joinRelativePath(ROOT_PATH, child.name)}
              name={child.name}
              depth={0}
              hasPendingSync={child.hasPendingSync === true}
            />
          ))}
      </ul>
    </TreeViewContext.Provider>
  );
};
