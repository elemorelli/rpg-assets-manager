import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { type DirectoryEntry, sortDirectoryEntries } from "#utils/directory-listing.ts";
import { computeDirectorySyncStatus, type RemoteIndexRecord } from "#utils/sync-status.ts";

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

const fetchLocalHashIndex = async (db: Kysely<DB>): Promise<Map<string, string>> => {
  const rows = await db.selectFrom("assets").select(["path", "hash"]).execute();

  return new Map(rows.map((row) => [row.path, row.hash]));
};

const fetchRemoteHashIndex = async (db: Kysely<DB>): Promise<Map<string, RemoteIndexRecord>> => {
  const rows = await db.selectFrom("remote_assets").select(["path", "hash", "size"]).execute();

  return new Map(rows.map((row) => [row.path, { hash: row.hash, size: Number(row.size) }]));
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

  const [tagsByPath, localIndex, remoteIndex] = await Promise.all([
    fetchTagsForPaths(
      db,
      fileEntries.map((file) => file.relativePath),
    ),
    fetchLocalHashIndex(db),
    fetchRemoteHashIndex(db),
  ]);

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
