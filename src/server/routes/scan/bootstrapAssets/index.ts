import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";
import { type DB, db } from "../../../db/index.ts";
import { hashBuffer } from "../../../utils/hash.ts";
import { walkAssetTree } from "../walkAssetTree.ts";

export interface BootstrapSummary {
  inserted: number;
  skipped: number;
}

export const bootstrapAssets = async (
  db: Kysely<DB>,
  rootDir: string,
): Promise<BootstrapSummary> => {
  const existingRows = await db.selectFrom("assets").select("path").execute();
  const existingPaths = new Set(existingRows.map((row) => row.path));

  const walkedFiles = await walkAssetTree(rootDir);

  let inserted = 0;
  let skipped = 0;

  for (const file of walkedFiles) {
    if (existingPaths.has(file.relativePath)) {
      skipped += 1;

      continue;
    }

    const absolutePath = path.join(rootDir, file.relativePath);
    const content = await fs.readFile(absolutePath);
    const hash = await hashBuffer(content);
    const mtime = new Date(file.mtimeMs);

    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto("assets")
        .values({ path: file.relativePath, size: file.size, mtime, hash })
        .execute();

      await trx
        .insertInto("remote_assets")
        .values({ path: file.relativePath, size: file.size, hash })
        .execute();
    });

    inserted += 1;
  }

  return { inserted, skipped };
};

export const bootstrapHandler = (assetTreeRoot: string) => async () =>
  bootstrapAssets(db, assetTreeRoot);
