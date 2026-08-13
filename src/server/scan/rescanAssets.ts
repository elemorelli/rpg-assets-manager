import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";
import { hashBuffer } from "../../core/hash.ts";
import { computeRescanPlan, type RescanPlanOptions } from "../../core/rescanPlan.ts";
import type { DB } from "../db-types.ts";
import { walkAssetTree } from "./walkAssetTree.ts";

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
