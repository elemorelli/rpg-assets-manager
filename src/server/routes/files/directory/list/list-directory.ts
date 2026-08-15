import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { type DirectoryEntry, sortDirectoryEntries } from "#utils/directory-listing.ts";

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

  const tagsByPath = await fetchTagsForPaths(
    db,
    fileEntries.map((file) => file.relativePath),
  );

  for (const file of fileEntries) {
    const tags = tagsByPath.get(file.relativePath);

    if (tags && tags.length > 0) {
      file.entry.tags = tags;
    }
  }

  return sortDirectoryEntries([...directoryEntries, ...fileEntries.map((file) => file.entry)]);
};
