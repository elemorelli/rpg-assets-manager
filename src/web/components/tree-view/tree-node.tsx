import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import type { JSX } from "react";

import { EntryContextMenu } from "#components/entry-context-menu/entry-context-menu.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import { useContextMenu } from "#web/utils/use-context-menu.ts";
import { useDragExpand } from "#web/utils/use-drag-expand.ts";
import { useInlineRename } from "#web/utils/use-inline-rename.ts";

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
  hasPendingSync: boolean;
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
  hasPendingSync,
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
  const {
    isRenaming,
    renameDraft,
    renameInputRef,
    startRenaming,
    commitRename,
    handleRenameKeyDown,
    handleRenameDraftChange,
  } = useInlineRename(name, (newName) => onRename(path, newName));
  const contextMenu = useContextMenu();
  const isExpanded = expandedPaths.has(path);
  const isActive = path === activePath;
  const isDropTarget = canDropOnPath(path);
  const state = childrenByPath[path];
  const nodeEntry: DirectoryEntry = { name, type: "directory" };
  const hasSubdirectories = !Array.isArray(state) || state.length > 0;

  const { dragOver, handleDragOver, handleDragLeave, handleDrop } = useDragExpand<HTMLLIElement>({
    isDropTarget,
    isExpanded,
    delayMs: DRAG_EXPAND_DELAY_MS,
    onExpand: () => onToggle(path),
    onDrop: () => onDropEntry(path),
  });

  return (
    <li onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <div
        className={clsx(styles.row, isDropTarget && dragOver && styles.dragOver)}
        style={{ paddingLeft: depth * INDENT_PX }}
        onContextMenu={contextMenu.open}>
        {hasSubdirectories ? (
          <button
            type="button"
            className={styles.toggle}
            aria-label={isExpanded ? `Collapse ${name}` : `Expand ${name}`}
            onClick={() => onToggle(path)}>
            <ChevronIcon expanded={isExpanded} />
          </button>
        ) : (
          <span className={styles.toggle} aria-hidden="true" />
        )}
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
            className={clsx(
              styles.nameButton,
              isActive && styles.active,
              hasPendingSync && styles.pending,
            )}
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
              hasPendingSync={child.hasPendingSync === true}
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
