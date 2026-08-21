import { type Kysely, sql } from "kysely";

import { type DB, db } from "#server/db/index.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesScopedPathQuery } from "#server/routes/files/path-body.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { type OperationScope, pathMatchesScope } from "#utils/operation-scope.ts";

import {
  buildHashGroups,
  type OrphanCandidate,
  type RenamePair,
  resolveRenames,
} from "./rename-resolution.ts";

interface PairedRow {
  local_path: string | null;
  local_hash: string | null;
  local_previous_hash: string | null;
  remote_path: string | null;
  remote_hash: string | null;
}

export interface BatchDiffResult {
  added: string[];
  deleted: string[];
  modified: string[];
  renamed: RenamePair[];
  ambiguousWarnings: { hash: string; localPaths: string[]; remotePaths: string[] }[];
}

export const computeBatchDiff = async (
  db: Kysely<DB>,
  scope: OperationScope = "all",
  relativeDir = "",
): Promise<BatchDiffResult> => {
  const { rows } = await sql<PairedRow>`
    SELECT
      a.path AS local_path,
      a.hash AS local_hash,
      a.previous_hash AS local_previous_hash,
      r.path AS remote_path,
      r.hash AS remote_hash
    FROM assets a
    FULL OUTER JOIN remote_assets r ON a.path = r.path
    ORDER BY COALESCE(a.path, r.path)
  `.execute(db);

  const modified: string[] = [];
  const orphanLocal: OrphanCandidate[] = [];
  const orphanRemote: OrphanCandidate[] = [];

  for (const row of rows) {
    const rowPath = row.local_path ?? row.remote_path;

    if (rowPath === null || !pathMatchesScope(rowPath, scope, relativeDir)) {
      continue;
    }

    if (row.local_path !== null && row.remote_path !== null) {
      if (row.local_hash !== row.remote_hash) {
        modified.push(row.local_path);
      }

      continue;
    }

    if (row.local_path !== null && row.local_hash !== null) {
      orphanLocal.push({
        path: row.local_path,
        hash: row.local_hash,
        previousHash: row.local_previous_hash ?? undefined,
      });
    }

    if (row.remote_path !== null && row.remote_hash !== null) {
      orphanRemote.push({ path: row.remote_path, hash: row.remote_hash });
    }
  }

  const { added, deleted, renamed, ambiguousWarnings } = resolveRenames(
    buildHashGroups(orphanLocal, orphanRemote),
  );

  return { added, deleted, modified, renamed, ambiguousWarnings };
};

export const diffHandler = withHttpErrorHandling(async (request) => {
  const query = request.query as FilesScopedPathQuery;
  const relativeDir = resolveSafeRelativePath(query.path ?? "");
  const scope: OperationScope = query.scope ?? "all";

  return await computeBatchDiff(db, scope, relativeDir);
});
