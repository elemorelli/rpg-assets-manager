import { getAncestorPaths, getParentPath, getPathDepth } from "#utils/directory-path.ts";

export interface TreeEntry {
  relativePath: string;
  isDirectory: boolean;
}

// Deepest first, so removing them in order never hits a directory that still holds another empty one.
export const findEmptyDirectories = (entries: readonly TreeEntry[]): string[] => {
  const nonEmptyDirectories = new Set<string>();

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }

    const parentDir = getParentPath(entry.relativePath);

    for (const ancestorPath of [parentDir, ...getAncestorPaths(parentDir)]) {
      nonEmptyDirectories.add(ancestorPath);
    }
  }

  const emptyDirectories = entries
    .filter((entry) => entry.isDirectory && !nonEmptyDirectories.has(entry.relativePath))
    .map((entry) => entry.relativePath);

  return emptyDirectories.toSorted((a, b) => getPathDepth(b) - getPathDepth(a));
};
