import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyRequest } from "fastify";
import type { Kysely } from "kysely";

import { invalidateLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { type DB, db } from "#server/db/index.ts";
import { recomputeAllDirectoryAggregates } from "#server/directory-aggregates/recompute-all.ts";
import { runTrackedJob } from "#server/routes/jobs/index.ts";
import { hashBuffer } from "#server/utils/hash.ts";

import { classifyHashedCandidates, type HashedCandidate } from "./classify.ts";
import { computeRescanPlan, type RescanPlanOptions } from "./plan.ts";
import { walkAssetTree } from "./walk-asset-tree.ts";

export interface RescanSummary {
  hashed: number;
  unchanged: number;
  removed: number;
  renamed: number;
}

export interface RescanProgress {
  done: number;
  total: number;
  detail?: string;
}

export const rescanAssets = async (
  db: Kysely<DB>,
  rootDir: string,
  options: RescanPlanOptions = {},
  onProgress?: (progress: RescanProgress) => void,
): Promise<RescanSummary> => {
  const previousRows = await db
    .selectFrom("assets")
    .select(["path", "size", "mtime", "hash"])
    .execute();
  const previous = previousRows.map((row) => ({
    path: row.path,
    size: Number(row.size),
    mtimeMs: row.mtime.getTime(),
    hash: row.hash,
  }));

  const current = await walkAssetTree(rootDir);
  const plan = computeRescanPlan(previous, current, options);
  const total = plan.toHash.length;

  const hashedCandidates: HashedCandidate[] = [];

  for (const [index, file] of plan.toHash.entries()) {
    onProgress?.({ done: index, total, detail: file.relativePath });

    const absolutePath = path.join(rootDir, file.relativePath);
    const content = await fs.readFile(absolutePath);
    const hash = await hashBuffer(content);

    hashedCandidates.push({
      relativePath: file.relativePath,
      size: file.size,
      mtimeMs: file.mtimeMs,
      hash,
    });
  }

  onProgress?.({ done: total, total });

  const { modified, renamePairs, added, removedPaths } = classifyHashedCandidates(
    previous,
    plan.toRemove,
    hashedCandidates,
  );

  for (const candidate of [...modified, ...added]) {
    const mtime = new Date(candidate.mtimeMs);

    await db
      .insertInto("assets")
      .values({ path: candidate.relativePath, size: candidate.size, mtime, hash: candidate.hash })
      .onConflict((oc) =>
        oc.column("path").doUpdateSet({
          size: candidate.size,
          mtime,
          hash: candidate.hash,
          scanned_at: new Date(),
        }),
      )
      .execute();
  }

  for (const pair of renamePairs) {
    await db
      .updateTable("assets")
      .set({
        path: pair.newPath,
        size: pair.size,
        mtime: new Date(pair.mtimeMs),
        hash: pair.hash,
        scanned_at: new Date(),
      })
      .where("path", "=", pair.oldPath)
      .execute();
  }

  for (const removedPath of removedPaths) {
    await db.deleteFrom("assets").where("path", "=", removedPath).execute();
  }

  await recomputeAllDirectoryAggregates(db, rootDir);

  invalidateLocalHashIndex(db);

  return {
    hashed: plan.toHash.length,
    unchanged: plan.unchanged.length,
    removed: removedPaths.length,
    renamed: renamePairs.length,
  };
};

interface RescanRequestBody {
  forceRehash?: boolean;
}

export const rescanHandler = (assetTreeRoot: string) => async (request: FastifyRequest) => {
  const body = request.body as RescanRequestBody | undefined;

  return runTrackedJob("rescan", "hashing", "rescan failed", (onProgress) =>
    rescanAssets(db, assetTreeRoot, { forceRehash: body?.forceRehash ?? false }, onProgress),
  );
};
