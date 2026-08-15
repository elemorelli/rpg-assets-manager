import { sql } from "kysely";

import { db } from "#server/db/index.ts";

export const listDistinctTags = async (): Promise<string[]> => {
  const { rows } = await sql<{ tag: string }>`
    SELECT DISTINCT unnest(tags) AS tag FROM assets ORDER BY tag
  `.execute(db);

  return rows.map((row) => row.tag);
};
