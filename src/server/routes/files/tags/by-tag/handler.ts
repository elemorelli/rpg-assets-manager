import type { FastifyRequest } from "fastify";

import { type FilesByTagEntry, findFilesByTags } from "./find-files-by-tag.ts";

interface ByTagQuery {
  tag?: string | string[];
}

export const filesByTagHandler = async (request: FastifyRequest): Promise<FilesByTagEntry[]> => {
  const query = request.query as ByTagQuery;
  const tags = Array.isArray(query.tag) ? query.tag : query.tag ? [query.tag] : [];

  return findFilesByTags(tags);
};
