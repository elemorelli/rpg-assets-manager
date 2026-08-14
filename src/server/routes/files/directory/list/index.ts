import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { type DirectoryEntry, sortDirectoryEntries } from "#utils/directory-listing.ts";

export const listDirectory = async (
  rootDir: string,
  requestedPath: string,
): Promise<DirectoryEntry[]> => {
  const relativeDir = resolveSafeRelativePath(requestedPath);
  const absoluteDir = path.join(rootDir, relativeDir);
  const dirents = await fs.readdir(absoluteDir, { withFileTypes: true });

  const entries: DirectoryEntry[] = [];

  for (const dirent of dirents) {
    if (dirent.isDirectory()) {
      entries.push({ name: dirent.name, type: "directory" });
      continue;
    }

    if (!dirent.isFile()) {
      continue;
    }

    const stat = await fs.stat(path.join(absoluteDir, dirent.name));

    entries.push({
      name: dirent.name,
      type: "file",
      size: stat.size,
      mtimeMs: Math.trunc(stat.mtimeMs),
    });
  }

  return sortDirectoryEntries(entries);
};

interface FilesPathQuery {
  path?: string;
}

export const listDirectoryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as FilesPathQuery;

    try {
      return await listDirectory(assetTreeRoot, query.path ?? "");
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
