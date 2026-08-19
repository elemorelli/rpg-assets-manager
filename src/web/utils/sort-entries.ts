import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { extensionOf } from "#utils/preview.ts";

export type SortCriterion = "name" | "type" | "size";
export type SortDirection = "asc" | "desc";

export interface SortState {
  criterion: SortCriterion;
  direction: SortDirection;
}

export const getNextSort = (clickedCriterion: SortCriterion, currentSort: SortState): SortState => {
  if (clickedCriterion !== currentSort.criterion) {
    return { criterion: clickedCriterion, direction: "asc" };
  }

  return {
    criterion: clickedCriterion,
    direction: currentSort.direction === "asc" ? "desc" : "asc",
  };
};

type Comparator = (a: DirectoryEntry, b: DirectoryEntry) => number;

const compareByName: Comparator = (a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const compareByType: Comparator = (a, b) => {
  const extensionComparison = extensionOf(a.name).localeCompare(extensionOf(b.name));

  return extensionComparison !== 0 ? extensionComparison : compareByName(a, b);
};

const compareBySize: Comparator = (a, b) => (a.size ?? 0) - (b.size ?? 0);

const COMPARATORS_BY_CRITERION: Record<SortCriterion, Comparator> = {
  name: compareByName,
  type: compareByType,
  size: compareBySize,
};

const withDirection =
  (comparator: Comparator, direction: SortDirection): Comparator =>
  (a, b) =>
    direction === "asc" ? comparator(a, b) : comparator(b, a);

export const sortEntries = (
  entries: DirectoryEntry[],
  criterion: SortCriterion,
  direction: SortDirection,
): DirectoryEntry[] => {
  const directories = entries.filter((entry) => entry.type === "directory");
  const files = entries.filter((entry) => entry.type === "file");

  const sortedDirectories = [...directories].sort(withDirection(compareByName, direction));
  const sortedFiles = [...files].sort(
    withDirection(COMPARATORS_BY_CRITERION[criterion], direction),
  );

  return [...sortedDirectories, ...sortedFiles];
};
