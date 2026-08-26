import type { FastifyRequest } from "fastify";

import { walkDirectory } from "#server/utils/walk-directory.ts";

import { type SearchableEntry, searchEntriesByName } from "./searchable.ts";

export const searchEntries = async (rootDir: string, query: string): Promise<SearchableEntry[]> => {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const walked = await walkDirectory(rootDir);
  const allEntries: SearchableEntry[] = [];

  for (const entry of walked) {
    if (entry.dirent.isDirectory()) {
      allEntries.push({ relativePath: entry.relativePath, type: "directory" });
    } else if (entry.dirent.isFile()) {
      allEntries.push({ relativePath: entry.relativePath, type: "file" });
    }
  }

  return searchEntriesByName(allEntries, normalizedQuery);
};

interface SearchQuery {
  q?: string;
}

export const searchEntriesHandler = (assetTreeRoot: string) => async (request: FastifyRequest) => {
  const query = request.query as SearchQuery;

  return searchEntries(assetTreeRoot, query.q ?? "");
};
