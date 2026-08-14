import type { FastifyReply, FastifyRequest } from "fastify";
import { type Kysely, sql } from "kysely";
import { type DB, db } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError, respondToHttpError } from "#server/errors/index.ts";

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

interface AcknowledgeWorldBody {
  world?: string;
  acknowledged?: boolean;
}

export const acknowledgeWorldHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ acknowledged: true } | undefined> => {
  const params = request.params as { id?: string };
  const body = request.body as AcknowledgeWorldBody | undefined;

  try {
    const syncRunId = Number(params.id);

    if (!Number.isInteger(syncRunId)) {
      throw new HttpError("Invalid sync run id", HTTP_STATUS.badRequest);
    }

    if (!body?.world || typeof body.acknowledged !== "boolean") {
      throw new HttpError("world and acknowledged are required", HTTP_STATUS.badRequest);
    }

    await acknowledgeWorld(db, syncRunId, body.world, body.acknowledged);

    return { acknowledged: true };
  } catch (error) {
    respondToHttpError(error, reply);

    return undefined;
  }
};
