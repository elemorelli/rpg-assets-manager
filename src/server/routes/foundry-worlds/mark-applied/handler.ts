import { db } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";

import { markFoundryWorldApplied } from "./mark-applied.ts";

export const markFoundryWorldAppliedHandler = withHttpErrorHandling(async (request) => {
  const params = request.params as { id?: string };
  const worldId = Number(params.id);

  if (!Number.isInteger(worldId)) {
    throw new HttpError("Invalid foundry world id", HTTP_STATUS.badRequest);
  }

  await markFoundryWorldApplied(db, worldId);

  return { applied: true };
});
