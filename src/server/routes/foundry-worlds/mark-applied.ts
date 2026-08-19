import type { Kysely } from "kysely";

import { type DB, db } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";

export const markFoundryWorldApplied = async (db: Kysely<DB>, worldId: number): Promise<void> => {
  const world = await db
    .selectFrom("foundry_worlds")
    .select("id")
    .where("id", "=", String(worldId))
    .executeTakeFirst();

  if (!world) {
    throw new HttpError("Foundry world not found", HTTP_STATUS.notFound);
  }

  await db
    .updateTable("foundry_worlds")
    .set({ acknowledged_at: new Date() })
    .where("id", "=", String(worldId))
    .execute();
};

export const markFoundryWorldAppliedHandler = withHttpErrorHandling(async (request) => {
  const params = request.params as { id?: string };
  const worldId = Number(params.id);

  if (!Number.isInteger(worldId)) {
    throw new HttpError("Invalid foundry world id", HTTP_STATUS.badRequest);
  }

  await markFoundryWorldApplied(db, worldId);

  return { applied: true };
});
