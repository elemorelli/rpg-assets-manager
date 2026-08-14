import { type Kysely, sql } from "kysely";
import type { DB } from "../../db/index.ts";
import { type HashGroup, type OrphanCandidate, resolveRenames } from "./renameResolution.ts";

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
  renamed: { oldPath: string; newPath: string }[];
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
    const bothPresent = row.local_path !== null && row.remote_path !== null;

    if (bothPresent) {
      if (row.local_hash !== row.remote_hash) {
        modified.push(row.local_path as string);
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

  const groupsByHash = new Map<string, HashGroup>();

  for (const candidate of orphanLocal) {
    const group = groupsByHash.get(candidate.hash) ?? {
      hash: candidate.hash,
      local: [],
      remote: [],
    };

    group.local.push(candidate);
    groupsByHash.set(candidate.hash, group);
  }

  for (const candidate of orphanRemote) {
    const group = groupsByHash.get(candidate.hash) ?? {
      hash: candidate.hash,
      local: [],
      remote: [],
    };

    group.remote.push(candidate);
    groupsByHash.set(candidate.hash, group);
  }

  const { added, deleted, renamed, ambiguousWarnings } = resolveRenames([...groupsByHash.values()]);

  return { added, deleted, modified, renamed, ambiguousWarnings };
};
