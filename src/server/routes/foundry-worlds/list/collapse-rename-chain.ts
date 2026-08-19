import type { RenamePair } from "#server/routes/diff/index.ts";

// A→B followed by B→C must reach the macro as A→C: a document still holding A would
// otherwise get rewritten to the now-dead B instead of the file's real current path.
// A path that starts a chain (its old path never appears as anyone's new path) is a
// root; walking forward from each root and marking every hop "consumed" lets a rare
// cyclical swap (A→B, B→A, no root at all) fall through untouched instead of being
// silently dropped.
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
