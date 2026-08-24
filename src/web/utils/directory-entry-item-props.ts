import type { DirectoryEntry } from "#utils/directory-listing.ts";
import type { SelectionClickModifier } from "#web/utils/row-selection.ts";

export interface DirectoryEntryItemProps {
  entry: DirectoryEntry;
  currentPath: string;
  isSelected: boolean;
  selectedEntries: DirectoryEntry[];
  isDropTarget: boolean;
  onOpenDirectory: (name: string) => void;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDelete: (entry: DirectoryEntry) => void;
  onDeleteMany: (entries: DirectoryEntry[]) => void;
  onDragStart: (entry: DirectoryEntry) => void;
  onDragEnd: () => void;
  onDropEntry: (entry: DirectoryEntry) => void;
  onSelectRow: (entry: DirectoryEntry, modifier: SelectionClickModifier) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
  onAddTagToMany: (entries: DirectoryEntry[], tag: string) => void;
  onOpenLightbox: (entry: DirectoryEntry) => void;
}
