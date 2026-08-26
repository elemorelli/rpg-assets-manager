import { getLocalHashIndex, getRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";
import { walkDirectory } from "#server/utils/walk-directory.ts";
import { type DirectoryEntry, sortDirectoryEntries } from "#utils/directory-listing.ts";
import { parentDirectory } from "#utils/paths.ts";
import { computeTreeWidePendingDirectoryPaths } from "#utils/sync-status.ts";

export type DirectoryTree = Record<string, DirectoryEntry[]>;

const ROOT_PATH = "";

// The tree only ever needs directory names and a pending-sync flag, so it
// skips everything `listDirectory` computes per file (fs.stat, tags, sizes):
// that per-file work is what turned "load the sidebar" into hundreds of slow
// per-folder requests when the tree used to fetch itself node by node.
export const buildDirectoryTree = async (rootDir: string): Promise<DirectoryTree> => {
  const [entries, localIndex, remoteIndex] = await Promise.all([
    walkDirectory(rootDir, { recursive: true }),
    getLocalHashIndex(),
    getRemoteHashIndex(),
  ]);

  const pendingDirectoryPaths = computeTreeWidePendingDirectoryPaths(localIndex, remoteIndex);
  const childrenByPath: DirectoryTree = { [ROOT_PATH]: [] };

  for (const entry of entries) {
    if (!entry.dirent.isDirectory()) {
      continue;
    }

    childrenByPath[entry.relativePath] = [];

    const directoryEntry: DirectoryEntry = { name: entry.dirent.name, type: "directory" };

    if (pendingDirectoryPaths.has(entry.relativePath)) {
      directoryEntry.hasPendingSync = true;
    }

    const parentPath = parentDirectory(entry.relativePath);

    childrenByPath[parentPath].push(directoryEntry);
  }

  for (const path of Object.keys(childrenByPath)) {
    childrenByPath[path] = sortDirectoryEntries(childrenByPath[path]);
  }

  return childrenByPath;
};

export const directoryTreeHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async () => await buildDirectoryTree(assetTreeRoot));
