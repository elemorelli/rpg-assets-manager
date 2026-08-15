import type { FastifyRequest } from "fastify";

import { searchEntries } from "./search-entries.ts";

interface SearchQuery {
  q?: string;
}

export const searchEntriesHandler = (assetTreeRoot: string) => async (request: FastifyRequest) => {
  const query = request.query as SearchQuery;

  return searchEntries(assetTreeRoot, query.q ?? "");
};
