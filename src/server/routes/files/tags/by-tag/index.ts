import type { FastifyRequest } from "fastify";
import { sql } from "kysely";
import { db } from "#server/db/index.ts";

export interface FilesByTagEntry {
  relativePath: string;
  type: "file";
}

export const findFilesByTags = async (tags: string[]): Promise<FilesByTagEntry[]> => {
  if (tags.length === 0) {
    return [];
  }

  const { rows } = await sql<{ path: string }>`
    SELECT path FROM assets WHERE tags @> ARRAY[${sql.join(tags)}]::text[] ORDER BY path
  `.execute(db);

  return rows.map((row) => ({ relativePath: row.path, type: "file" as const }));
};

interface ByTagQuery {
  tag?: string | string[];
}

export const filesByTagHandler = async (request: FastifyRequest): Promise<FilesByTagEntry[]> => {
  const query = request.query as ByTagQuery;
  const tags = Array.isArray(query.tag) ? query.tag : query.tag ? [query.tag] : [];

  return findFilesByTags(tags);
};
