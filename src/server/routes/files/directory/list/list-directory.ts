import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import { getLocalHashIndex, getRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { type DirectoryEntry, sortDirectoryEntries } from "#utils/directory-listing.ts";
import { computeDirectorySyncStatus } from "#utils/sync-status.ts";

const fetchTagsForPaths = async (
  db: Kysely<DB>,
  paths: string[],
): Promise<Map<string, string[]>> => {
  if (paths.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom("assets")
    .select(["path", "tags"])
    .where("path", "in", paths)
    .execute();

  return new Map(rows.map((row) => [row.path, row.tags]));
};

const fetchDirectorySizesForPaths = async (
  db: Kysely<DB>,
  paths: string[],
): Promise<Map<string, number>> => {
  if (paths.length === 0) {
    return new Map();
  }

  const rows = await db
    .selectFrom("directories")
    .select(["path", "total_size"])
    .where("path", "in", paths)
    .execute();

  return new Map(rows.map((row) => [row.path, Number(row.total_size)]));
};

export const listDirectory = async (
  db: Kysely<DB>,
  rootDir: string,
  requestedPath: string,
): Promise<DirectoryEntry[]> => {
  const relativeDir = resolveSafeRelativePath(requestedPath);
  const absoluteDir = path.join(rootDir, relativeDir);
  const dirents = await fs.readdir(absoluteDir, { withFileTypes: true });

  const directoryEntries: DirectoryEntry[] = [];
  const fileEntries: { entry: DirectoryEntry; relativePath: string }[] = [];

  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      directoryEntries.push({ name: dirent.name, type: "directory" });
      continue;
    }

    if (!dirent.isFile()) {
      continue;
    }

    const stat = await fs.stat(path.join(absoluteDir, dirent.name));
    const relativePath = relativeDir ? `${relativeDir}/${dirent.name}` : dirent.name;

    fileEntries.push({
      entry: {
        name: dirent.name,
        type: "file",
        size: stat.size,
        mtimeMs: Math.trunc(stat.mtimeMs),
      },
      relativePath,
    });
  }

  const [tagsByPath, localIndex, remoteIndex, sizeByDirectoryPath] = await Promise.all([
    fetchTagsForPaths(
      db,
      fileEntries.map((file) => file.relativePath),
    ),
    getLocalHashIndex(db),
    getRemoteHashIndex(db),
    fetchDirectorySizesForPaths(
      db,
      directoryEntries.map((directory) =>
        relativeDir ? `${relativeDir}/${directory.name}` : directory.name,
      ),
    ),
  ]);

  for (const directory of directoryEntries) {
    const directoryPath = relativeDir ? `${relativeDir}/${directory.name}` : directory.name;
    const size = sizeByDirectoryPath.get(directoryPath);

    if (size !== undefined) {
      directory.size = size;
    }
  }

  for (const file of fileEntries) {
    const tags = tagsByPath.get(file.relativePath);

    if (tags && tags.length > 0) {
      file.entry.tags = tags;
    }
  }

  const syncStatus = computeDirectorySyncStatus({
    relativeDir,
    fileNames: fileEntries.map((file) => file.entry.name),
    directoryNames: directoryEntries.map((entry) => entry.name),
    localIndex,
    remoteIndex,
  });

  for (const file of fileEntries) {
    if (syncStatus.pendingFileNames.has(file.entry.name)) {
      file.entry.syncStatus = "pending";
    } else if (syncStatus.renamedFileNames.has(file.entry.name)) {
      file.entry.syncStatus = "renamed";
    } else if (syncStatus.newFileNames.has(file.entry.name)) {
      file.entry.syncStatus = "new";
    }
  }

  for (const directory of directoryEntries) {
    if (syncStatus.pendingDirectoryNames.has(directory.name)) {
      directory.hasPendingSync = true;
    }
  }

  const deletedEntries: DirectoryEntry[] = syncStatus.deletedFiles.map((deletedFile) => ({
    name: deletedFile.name,
    type: "file",
    size: deletedFile.size,
    syncStatus: "deleted",
  }));

  return sortDirectoryEntries([
    ...directoryEntries,
    ...fileEntries.map((file) => file.entry),
    ...deletedEntries,
  ]);
};
