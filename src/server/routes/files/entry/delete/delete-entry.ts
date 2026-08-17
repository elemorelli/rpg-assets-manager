import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export const deleteEntry = async (
  db: Kysely<DB>,
  rootDir: string,
  requestedPath: string,
): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);

  if (relativePath === "") {
    throw new HttpError("Cannot delete the asset tree root", HTTP_STATUS.badRequest);
  }

  const absolutePath = path.join(rootDir, relativePath);

  await fs.rm(absolutePath, { recursive: true, force: false });

  // "relativePath" may be a file or a directory: remove the exact match and
  // every path nested under it in one statement.
  const descendantLikePattern = `${relativePath}/%`;

  await db
    .deleteFrom("assets")
    .where((eb) =>
      eb.or([eb("path", "=", relativePath), eb("path", "like", descendantLikePattern)]),
    )
    .execute();
};
