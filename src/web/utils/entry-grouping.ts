import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { classifyPreviewKind } from "#utils/preview.ts";

export type GroupCriterion = "none" | "tag" | "type";

export interface EntryGroup {
  label: string | null;
  entries: DirectoryEntry[];
}

const DIRECTORIES_LABEL = "Directories";
const UNTAGGED_LABEL = "Untagged";

const TYPE_GROUP_LABELS: Record<ReturnType<typeof classifyPreviewKind>, string> = {
  image: "Images",
  audio: "Audio",
  unsupported: "Other",
};

const TYPE_GROUP_ORDER: ReturnType<typeof classifyPreviewKind>[] = [
  "image",
  "audio",
  "unsupported",
];

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

const groupFilesByType = (files: DirectoryEntry[]): EntryGroup[] => {
  const entriesByKind = new Map<ReturnType<typeof classifyPreviewKind>, DirectoryEntry[]>();

  for (const file of files) {
    const kind = classifyPreviewKind(file.name);
    const existingEntries = entriesByKind.get(kind) ?? [];

    existingEntries.push(file);
    entriesByKind.set(kind, existingEntries);
  }

  return TYPE_GROUP_ORDER.filter((kind) => entriesByKind.has(kind)).map((kind) => ({
    label: TYPE_GROUP_LABELS[kind],
    entries: entriesByKind.get(kind) ?? [],
  }));
};

const GROUPERS_BY_CRITERION: Record<
  Exclude<GroupCriterion, "none">,
  (files: DirectoryEntry[]) => EntryGroup[]
> = {
  tag: groupFilesByTag,
  type: groupFilesByType,
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

  return [...directoryGroup, ...GROUPERS_BY_CRITERION[criterion](files)];
};
