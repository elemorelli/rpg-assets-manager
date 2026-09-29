import type { RenamePair } from "#utils/diff.ts";

// A→B then B→C becomes A→C so documents skip the dead B; walking only from chain roots leaves cyclic swaps untouched.
export const collapseRenameChain = (pairs: RenamePair[]): RenamePair[] => {
  const newPathByOldPath = new Map(pairs.map((pair) => [pair.oldPath, pair.newPath]));
  const newPaths = new Set(pairs.map((pair) => pair.newPath));
  const rootOldPaths = pairs
    .map((pair) => pair.oldPath)
    .filter((oldPath) => !newPaths.has(oldPath));

  const consumedOldPaths = new Set<string>(rootOldPaths);
  const collapsedFromRoots = rootOldPaths.map((oldPath) => {
    let finalPath = oldPath;

    while (
      newPathByOldPath.has(finalPath) &&
      !consumedOldPaths.has(newPathByOldPath.get(finalPath) as string)
    ) {
      finalPath = newPathByOldPath.get(finalPath) as string;
      consumedOldPaths.add(finalPath);
    }

    return { oldPath, newPath: finalPath };
  });

  const leftoverPairs = pairs.filter((pair) => !consumedOldPaths.has(pair.oldPath));

  return [...collapsedFromRoots, ...leftoverPairs];
};
