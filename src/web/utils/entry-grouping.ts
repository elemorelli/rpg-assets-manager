import type { DirectoryEntry } from "#utils/directory-listing.ts";

export type GroupCriterion = "none" | "tag";

export interface EntryGroup {
  label: string | null;
  entries: DirectoryEntry[];
}

const DIRECTORIES_LABEL = "Directories";
const UNTAGGED_LABEL = "Untagged";

const groupFilesByTag = (files: DirectoryEntry[]): EntryGroup[] => {
  const entriesByTag = new Map<string, DirectoryEntry[]>();
  const untagged: DirectoryEntry[] = [];

  for (const file of files) {
    const uniqueTags = [...new Set(file.tags ?? [])];

    if (uniqueTags.length === 0) {
      untagged.push(file);
      continue;
    }

    for (const tag of uniqueTags) {
      const existingEntries = entriesByTag.get(tag) ?? [];

      existingEntries.push(file);
      entriesByTag.set(tag, existingEntries);
    }
  }

  const tagGroups = [...entriesByTag.entries()]
    .sort(([tagA], [tagB]) => tagA.localeCompare(tagB, undefined, { sensitivity: "base" }))
    .map(([tag, entries]) => ({ label: tag, entries }));

  return untagged.length > 0
    ? [...tagGroups, { label: UNTAGGED_LABEL, entries: untagged }]
    : tagGroups;
};

export const groupEntries = (
  sortedEntries: DirectoryEntry[],
  criterion: GroupCriterion,
): EntryGroup[] => {
  if (criterion === "none") {
    return [{ label: null, entries: sortedEntries }];
  }

  const directories = sortedEntries.filter((entry) => entry.type === "directory");
  const files = sortedEntries.filter((entry) => entry.type === "file");

  const directoryGroup: EntryGroup[] =
    directories.length > 0 ? [{ label: DIRECTORIES_LABEL, entries: directories }] : [];

  return [...directoryGroup, ...groupFilesByTag(files)];
};
