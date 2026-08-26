import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import type { JSX } from "react";

import { AssetPreview } from "#components/asset-preview/asset-preview.tsx";
import { EntryContextMenu } from "#components/entry-context-menu/entry-context-menu.tsx";
import { TagBadgeList } from "#components/tag-badge-list/tag-badge-list.tsx";
import { joinRelativePath } from "#utils/paths.ts";
import type { DirectoryEntryItemProps } from "#web/utils/directory-entry-item-props.ts";
import { useDirectoryEntryInteractions } from "#web/utils/use-directory-entry-interactions.ts";

import styles from "./directory-table.module.css";

export type DirectoryTableRowProps = DirectoryEntryItemProps;

export const DirectoryTableRow = ({
  entry,
  currentPath,
  isSelected,
  selectedEntries,
  isDropTarget,
  onOpenDirectory,
  onRename,
  onDelete,
  onDeleteMany,
  onDragStart,
  onDragEnd,
  onDropEntry,
  onSelectRow,
  availableTags,
  onTagsChange,
  onAddTagToMany,
  onOpenLightbox,
}: DirectoryTableRowProps): JSX.Element => {
  const {
    isRenaming,
    renameDraft,
    renameInputRef,
    startRenaming,
    commitRename,
    handleRenameKeyDown,
    handleRenameDraftChange,
    isDeleted,
    isNew,
    isRenamed,
    isPending,
    dragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragStart,
    handleClick,
    handleNameClick,
    contextMenu,
    sizeLabel,
    handleMenuButtonClick,
  } = useDirectoryEntryInteractions<HTMLTableRowElement>({
    entry,
    isDropTarget,
    onOpenDirectory,
    onRename,
    onDragStart,
    onDropEntry,
    onSelectRow,
    onOpenLightbox,
  });

  const entriesForContextMenu =
    isSelected && selectedEntries.length > 1 ? selectedEntries : [entry];

  return (
    <tr
      draggable={!isDeleted}
      aria-selected={isSelected}
      className={clsx(
        !isDeleted && styles.row,
        isDropTarget && dragOver && styles.dragOver,
        isSelected && styles.selected,
      )}
      onClick={isDeleted ? undefined : handleClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={isDeleted ? undefined : contextMenu.open}>
      <td className={styles.preview}>
        <span className={styles.previewCell}>
          <AssetPreview
            entry={entry}
            relativePath={joinRelativePath(currentPath, entry.name)}
            onOpen={onOpenLightbox}
          />
        </span>
      </td>
      <td>
        <span
          className={clsx(
            styles.nameCell,
            isPending && styles.pending,
            isNew && styles.new,
            isRenamed && styles.renamed,
            isDeleted && styles.deleted,
          )}>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              className={styles.renameInput}
              aria-label={`Rename ${entry.name}`}
              value={renameDraft}
              onChange={handleRenameDraftChange}
              onKeyDown={handleRenameKeyDown}
              onBlur={commitRename}
            />
          ) : entry.type === "directory" ? (
            <button
              type="button"
              className={clsx(styles.nameButton, isPending && styles.pending)}
              onClick={handleNameClick}>
              {entry.name}
            </button>
          ) : (
            entry.name
          )}
          {entry.type === "file" && entry.tags && entry.tags.length > 0 && (
            <TagBadgeList tags={entry.tags} />
          )}
        </span>
      </td>
      <td className={styles.shrink}>{entry.type}</td>
      <td className={styles.shrink}>{sizeLabel}</td>
      <td className={styles.actions}>
        {!isDeleted && (
          <>
            <button
              type="button"
              className={styles.menuButton}
              aria-label={`Actions for ${entry.name}`}
              onClick={handleMenuButtonClick}>
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
            <EntryContextMenu
              entry={entry}
              relativePath={joinRelativePath(currentPath, entry.name)}
              selectedEntries={entriesForContextMenu}
              position={contextMenu.position}
              onClose={contextMenu.close}
              onView={onOpenLightbox}
              onRenameRequested={startRenaming}
              onDelete={onDelete}
              onDeleteMany={onDeleteMany}
              availableTags={availableTags}
              onTagsChange={onTagsChange}
              onAddTagToMany={onAddTagToMany}
            />
          </>
        )}
      </td>
    </tr>
  );
};
