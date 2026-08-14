export interface SearchableEntry {
  relativePath: string;
  type: "file" | "directory";
}

export const MAX_SEARCH_RESULTS = 200;

const basename = (relativePath: string): string => relativePath.split("/").at(-1) ?? relativePath;

export const searchEntriesByName = (
  entries: SearchableEntry[],
  query: string,
): SearchableEntry[] => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const matches = entries.filter((entry) =>
    basename(entry.relativePath).toLowerCase().includes(normalizedQuery),
  );

  const sortedMatches = matches.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, { sensitivity: "base" }),
  );

  return sortedMatches.slice(0, MAX_SEARCH_RESULTS);
};
