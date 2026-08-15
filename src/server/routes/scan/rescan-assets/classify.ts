import { buildHashGroups, resolveRenames } from "../../diff/rename-resolution.ts";
import type { PreviousAssetSnapshot } from "./plan.ts";

export interface HashedCandidate {
  relativePath: string;
  size: number;
  mtimeMs: number;
  hash: string;
}

export interface RenamePairWithMetadata {
  oldPath: string;
  newPath: string;
  size: number;
  mtimeMs: number;
  hash: string;
}

export interface ClassifiedCandidates {
  modified: HashedCandidate[];
  renamePairs: RenamePairWithMetadata[];
  added: HashedCandidate[];
  removedPaths: string[];
}

export const classifyHashedCandidates = (
  previous: PreviousAssetSnapshot[],
  toRemove: string[],
  hashedCandidates: HashedCandidate[],
): ClassifiedCandidates => {
  const previousByPath = new Map(previous.map((asset) => [asset.path, asset]));
  const toRemoveSet = new Set(toRemove);

  const modified: HashedCandidate[] = [];
  const newPathCandidates: HashedCandidate[] = [];

  for (const candidate of hashedCandidates) {
    if (previousByPath.has(candidate.relativePath)) {
      modified.push(candidate);

      continue;
    }

    newPathCandidates.push(candidate);
  }

  const removedSnapshots = previous.filter((asset) => toRemoveSet.has(asset.path));

  const groups = buildHashGroups(
    newPathCandidates.map((candidate) => ({ path: candidate.relativePath, hash: candidate.hash })),
    removedSnapshots.map((asset) => ({ path: asset.path, hash: asset.hash })),
  );

  const { renamed, added, deleted } = resolveRenames(groups);
  const newPathByPath = new Map(
    newPathCandidates.map((candidate) => [candidate.relativePath, candidate]),
  );

  const renamePairs: RenamePairWithMetadata[] = renamed.map((pair) => {
    const candidate = newPathByPath.get(pair.newPath);

    if (!candidate) {
      throw new Error(`resolveRenames returned an unknown new path: ${pair.newPath}`);
    }

    return {
      oldPath: pair.oldPath,
      newPath: pair.newPath,
      size: candidate.size,
      mtimeMs: candidate.mtimeMs,
      hash: candidate.hash,
    };
  });

  const addedCandidates = added.map((addedPath) => {
    const candidate = newPathByPath.get(addedPath);

    if (!candidate) {
      throw new Error(`resolveRenames returned an unknown added path: ${addedPath}`);
    }

    return candidate;
  });

  return { modified, renamePairs, added: addedCandidates, removedPaths: deleted };
};
