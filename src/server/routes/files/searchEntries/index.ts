import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyRequest } from "fastify";
import { type SearchableEntry, searchEntriesByName } from "../../../../core/searchAssets.ts";

const walkAllEntries = async (
  rootDir: string,
  currentDir: string,
  results: SearchableEntry[],
): Promise<void> => {
  const dirents = await fs.readdir(currentDir, { withFileTypes: true });

  for (const dirent of dirents) {
    const entryPath = path.join(currentDir, dirent.name);
    const relativePath = path.relative(rootDir, entryPath).split(path.sep).join("/");

    if (dirent.isDirectory()) {
      results.push({ relativePath, type: "directory" });
      await walkAllEntries(rootDir, entryPath, results);

      continue;
    }

    if (dirent.isFile()) {
      results.push({ relativePath, type: "file" });
    }
  }
};

export const searchEntries = async (rootDir: string, query: string): Promise<SearchableEntry[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const allEntries: SearchableEntry[] = [];

  await walkAllEntries(rootDir, rootDir, allEntries);

  return searchEntriesByName(allEntries, normalizedQuery);
};

interface SearchQuery {
  q?: string;
}

export const searchEntriesHandler = (assetTreeRoot: string) => async (request: FastifyRequest) => {
  const query = request.query as SearchQuery;

  return searchEntries(assetTreeRoot, query.q ?? "");
};
