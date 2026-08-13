import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { hashBuffer } from "../../../core/hash.ts";
import { computeRescanPlan, type RescanPlanOptions } from "../../../core/rescanPlan.ts";
import { type DB, db } from "../../db/index.ts";
import { walkAssetTree } from "../walkAssetTree.ts";

export interface RescanSummary {
  hashed: number;
  unchanged: number;
  removed: number;
}

export const rescanAssets = async (
  db: Kysely<DB>,
  rootDir: string,
  options: RescanPlanOptions = {},
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

  for (const file of plan.toHash) {
    const absolutePath = path.join(rootDir, file.relativePath);
    const content = await fs.readFile(absolutePath);
    const hash = await hashBuffer(content);
    const mtime = new Date(file.mtimeMs);

    await db
      .insertInto("assets")
      .values({ path: file.relativePath, size: file.size, mtime, hash })
      .onConflict((oc) =>
        oc.column("path").doUpdateSet({ size: file.size, mtime, hash, scanned_at: new Date() }),
      )
      .execute();
  }

  for (const removedPath of plan.toRemove) {
    await db.deleteFrom("assets").where("path", "=", removedPath).execute();
  }

  return {
    hashed: plan.toHash.length,
    unchanged: plan.unchanged.length,
    removed: plan.toRemove.length,
  };
};

interface RescanRequestBody {
  forceRehash?: boolean;
}

export const rescanHandler = (assetTreeRoot: string) => async (request: FastifyRequest) => {
  const body = request.body as RescanRequestBody | undefined;

  return rescanAssets(db, assetTreeRoot, { forceRehash: body?.forceRehash ?? false });
};
