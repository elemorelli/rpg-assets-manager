import { type Kysely, sql } from "kysely";

import { type DB, db } from "#server/db/index.ts";

import {
  buildHashGroups,
  type OrphanCandidate,
  type RenamePair,
  resolveRenames,
} from "./rename-resolution.ts";

interface PairedRow {
  local_path: string | null;
  local_hash: string | null;
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

export const computeBatchDiff = async (db: Kysely<DB>): Promise<BatchDiffResult> => {
  const { rows } = await sql<PairedRow>`
    SELECT
      a.path AS local_path,
      a.hash AS local_hash,
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
    if (row.local_path !== null && row.remote_path !== null) {
      if (row.local_hash !== row.remote_hash) {
        modified.push(row.local_path);
      }

      continue;
    }

    if (row.local_path !== null && row.local_hash !== null) {
      orphanLocal.push({ path: row.local_path, hash: row.local_hash });
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

export const diffHandler = async () => computeBatchDiff(db);
