import { getLocalHashIndex, getRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";
import { walkDirectory } from "#server/utils/walk-directory.ts";
import {
  type DirectoryEntry,
  type DirectoryTree,
  sortDirectoryEntries,
} from "#utils/directory-listing.ts";
import { getParentPath } from "#utils/directory-path.ts";
import { computeTreeWidePendingDirectoryPaths } from "#utils/sync-status.ts";

const ROOT_PATH = "";

// Skips the per-file work of listDirectory (stat, tags, sizes), which made the sidebar load slowly.
export const buildDirectoryTree = async (rootDir: string): Promise<DirectoryTree> => {
  const [entries, localIndex, remoteIndex] = await Promise.all([
    walkDirectory(rootDir),
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

    const parentPath = getParentPath(entry.relativePath);

    childrenByPath[parentPath].push(directoryEntry);
  }

  for (const path of Object.keys(childrenByPath)) {
    childrenByPath[path] = sortDirectoryEntries(childrenByPath[path]);
  }

  return childrenByPath;
};

export const directoryTreeHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(() => buildDirectoryTree(assetTreeRoot));
