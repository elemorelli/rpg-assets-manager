import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import {
  type ChangeEvent,
  type DragEvent,
  type JSX,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { EntryContextMenu } from "#components/entry-context-menu/entry-context-menu.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { useContextMenu } from "#web/utils/use-context-menu.ts";

import styles from "./tree-view.module.css";

export type TreeChildrenState = "loading" | "error" | DirectoryEntry[];

const INDENT_PX = 16;
const DRAG_EXPAND_DELAY_MS = 600;

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
  onRename: (path: string, newName: string) => void;
  onDelete: (path: string) => void;
  availableTags: string[];
  onTagsChange: (path: string, tags: string[]) => void;
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
  onRename,
  onDelete,
  availableTags,
  onTagsChange,
}: TreeNodeProps): JSX.Element => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(name);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const dragExpandTimerRef = useRef<number | null>(null);
  const contextMenu = useContextMenu();
  const isExpanded = expandedPaths.has(path);
  const isActive = path === activePath;
  const isDropTarget = canDropOnPath(path);
  const state = childrenByPath[path];
  const nodeEntry: DirectoryEntry = { name, type: "directory" };

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const clearDragExpandTimer = (): void => {
    if (dragExpandTimerRef.current !== null) {
      window.clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearDragExpandTimer();
    };
  }, []);

  const handleDragOver = (event: DragEvent<HTMLLIElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();

    if (!dragOver) {
      setDragOver(true);

      if (!isExpanded && dragExpandTimerRef.current === null) {
        dragExpandTimerRef.current = window.setTimeout(() => {
          dragExpandTimerRef.current = null;
          onToggle(path);
        }, DRAG_EXPAND_DELAY_MS);
      }
    }
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
    clearDragExpandTimer();
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(false);
    clearDragExpandTimer();
    onDropEntry(path);
  };

  const startRenaming = (): void => {
    setRenameDraft(name);
    setIsRenaming(true);
  };

  const commitRename = (): void => {
    const trimmed = renameDraft.trim();

    if (trimmed && trimmed !== name) {
      onRename(path, trimmed);
    }

    setIsRenaming(false);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsRenaming(false);
    }
  };

  const handleRenameDraftChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setRenameDraft(event.target.value);
  };

  return (
    <li onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div
        className={clsx(styles.row, isDropTarget && dragOver && styles.dragOver)}
        style={{ paddingLeft: depth * INDENT_PX }}
        onContextMenu={contextMenu.open}>
        <button
          type="button"
          className={styles.toggle}
          aria-label={isExpanded ? `Collapse ${name}` : `Expand ${name}`}
          onClick={() => onToggle(path)}>
          <ChevronIcon expanded={isExpanded} />
        </button>
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            className={styles.renameInput}
            aria-label={`Rename ${name}`}
            value={renameDraft}
            onChange={handleRenameDraftChange}
            onKeyDown={handleRenameKeyDown}
            onBlur={commitRename}
          />
        ) : (
          <button
            type="button"
            className={clsx(styles.nameButton, isActive && styles.active)}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onNavigate(path)}>
            {name}
          </button>
        )}
        <button
          type="button"
          className={styles.menuButton}
          aria-label={`Actions for ${name}`}
          onClick={contextMenu.open}>
          <FontAwesomeIcon icon={faEllipsisVertical} />
        </button>
        <EntryContextMenu
          entry={nodeEntry}
          position={contextMenu.position}
          onClose={contextMenu.close}
          onView={() => {}}
          onRenameRequested={startRenaming}
          onDelete={() => onDelete(path)}
          availableTags={availableTags}
          onTagsChange={(_entry, tags) => onTagsChange(path, tags)}
        />
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
              onRename={onRename}
              onDelete={onDelete}
              availableTags={availableTags}
              onTagsChange={onTagsChange}
            />
          ))}
        </ul>
      )}
    </li>
  );
};
