import type { JSX } from "react";

import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import type { DirectoryEntry } from "#utils/directory-listing.ts";

import styles from "./entry-tags-section.module.css";

export interface EntryTagsSectionProps {
  entry: DirectoryEntry;
  selectedEntries: DirectoryEntry[];
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
  onAddTagToMany: (entries: DirectoryEntry[], tag: string) => void;
}

export const EntryTagsSection = ({
  entry,
  selectedEntries,
  availableTags,
  onTagsChange,
  onAddTagToMany,
}: EntryTagsSectionProps): JSX.Element | null => {
  const isMultiSelection = selectedEntries.length > 1;
  const selectedFileEntries = selectedEntries.filter((candidate) => candidate.type === "file");

  if (isMultiSelection) {
    if (selectedFileEntries.length === 0) {
      return null;
    }

    return (
      <div className={styles.tagsSection}>
        <TagEditor
          entryKey={`batch-${entry.name}`}
          tags={[]}
          availableTags={availableTags}
          onChange={(tags) => onAddTagToMany(selectedFileEntries, tags[0] ?? "")}
        />
      </div>
    );
  }

  if (entry.type !== "file") {
    return null;
  }

  return (
    <div className={styles.tagsSection}>
      <TagEditor
        entryKey={entry.name}
        tags={entry.tags ?? []}
        availableTags={availableTags}
        onChange={(tags) => onTagsChange(entry, tags)}
      />
    </div>
  );
};
