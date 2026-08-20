import type { DragEvent, JSX } from "react";

import { joinRelativePath } from "#utils/paths.ts";
import { ROOT_PATH } from "#web/utils/breadcrumbs.ts";

import { TreeNode } from "./tree-node.tsx";
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
    <ul className={styles.tree} onDragOver={handleRootDragOver} onDrop={handleRootDrop}>
      {rootState === "error" && (
        <li className={styles.error}>
          Failed to load.{" "}
          <button type="button" onClick={() => handleRetry(ROOT_PATH)}>
            Retry
          </button>
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
            activePath={activePath}
            expandedPaths={expandedPaths}
            childrenByPath={childrenByPath}
            onToggle={handleToggle}
            onRetry={handleRetry}
            onNavigate={onNavigate}
            canDropOnPath={canDropOnPath}
            onDropEntry={onDropEntry}
            onRename={onRename}
            onDelete={onDelete}
            availableTags={availableTags}
            onTagsChange={onTagsChange}
          />
        ))}
    </ul>
  );
};
