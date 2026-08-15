import clsx from "clsx";
import { type DragEvent, type JSX, useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";

import styles from "./tree-view.module.css";

export type TreeChildrenState = "loading" | "error" | DirectoryEntry[];

const INDENT_PX = 16;

const ChevronIcon = ({ expanded }: { expanded: boolean }): JSX.Element => (
  <svg
    className={clsx(styles.chevron, expanded && styles.chevronExpanded)}
    width="10"
    height="10"
    viewBox="0 0 10 10"
    aria-hidden="true">
    <path d="M2 1 L8 5 L2 9 Z" fill="currentColor" />
  </svg>
);

export interface TreeNodeProps {
  path: string;
  name: string;
  depth: number;
  activePath: string;
  expandedPaths: Set<string>;
  childrenByPath: Record<string, TreeChildrenState>;
  onToggle: (path: string) => void;
  onRetry: (path: string) => void;
  onNavigate: (path: string) => void;
  canDropOnPath: (path: string) => boolean;
  onDropEntry: (path: string) => void;
}

export const TreeNode = ({
  path,
  name,
  depth,
  activePath,
  expandedPaths,
  childrenByPath,
  onToggle,
  onRetry,
  onNavigate,
  canDropOnPath,
  onDropEntry,
}: TreeNodeProps): JSX.Element => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const isExpanded = expandedPaths.has(path);
  const isActive = path === activePath;
  const isDropTarget = canDropOnPath(path);
  const state = childrenByPath[path];

  const handleDragOver = (event: DragEvent<HTMLLIElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(false);
    onDropEntry(path);
  };

  return (
    <li onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div
        className={clsx(styles.row, isDropTarget && dragOver && styles.dragOver)}
        style={{ paddingLeft: depth * INDENT_PX }}>
        <button
          type="button"
          className={styles.toggle}
          aria-label={isExpanded ? `Collapse ${name}` : `Expand ${name}`}
          onClick={() => onToggle(path)}>
          <ChevronIcon expanded={isExpanded} />
        </button>
        <button
          type="button"
          className={clsx(styles.nameButton, isActive && styles.active)}
          aria-current={isActive ? "true" : undefined}
          onClick={() => onNavigate(path)}>
          {name}
        </button>
      </div>
      {isExpanded && state === "error" && (
        <p className={styles.error}>
          Failed to load.{" "}
          <button type="button" onClick={() => onRetry(path)}>
            Retry
          </button>
        </p>
      )}
      {isExpanded && Array.isArray(state) && (
        <ul className={styles.children}>
          {state.map((child) => (
            <TreeNode
              key={child.name}
              path={joinRelativePath(path, child.name)}
              name={child.name}
              depth={depth + 1}
              activePath={activePath}
              expandedPaths={expandedPaths}
              childrenByPath={childrenByPath}
              onToggle={onToggle}
              onRetry={onRetry}
              onNavigate={onNavigate}
              canDropOnPath={canDropOnPath}
              onDropEntry={onDropEntry}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
