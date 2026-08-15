import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { DB } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";

export const acknowledgeWorld = async (
  db: Kysely<DB>,
  syncRunId: number,
  world: string,
  acknowledged: boolean,
): Promise<void> => {
  const result = await sql`
    UPDATE sync_runs
    SET world_acknowledgements = jsonb_set(
      world_acknowledgements,
      ARRAY[${world}]::text[],
      to_jsonb(${acknowledged}::boolean)
    )
    WHERE id = ${syncRunId}
  `.execute(db);

  if (!result.numAffectedRows) {
    throw new HttpError("Sync run not found", HTTP_STATUS.notFound);
  }
};
