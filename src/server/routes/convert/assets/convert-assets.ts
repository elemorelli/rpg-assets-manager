import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import { invalidateLocalHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";
import { hashBuffer } from "#server/utils/hash.ts";

import { getConversionPlan } from "../plan/index.ts";
import { convertToOgg } from "./to-ogg.ts";
import { convertToWebp } from "./to-webp.ts";

export interface ConversionSummary {
  converted: number;
  overwritten: number;
}

export interface ConversionProgress {
  done: number;
  total: number;
}

// Candidate paths are relative to the (possibly folder-scoped) rootDir used for
// I/O, but the assets table always keys rows by path from the asset tree root,
// so callers pass dbPathPrefix to translate between the two.
const toDbPath = (dbPathPrefix: string, relativePath: string): string =>
  path.posix.join(dbPathPrefix, relativePath);

export const convertAssets = async (
  db: Kysely<DB>,
  rootDir: string,
  dbPathPrefix: string,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<ConversionSummary> => {
  const plan = await getConversionPlan(rootDir);
  const total = plan.candidates.length;

  onProgress?.({ done: 0, total });

  for (const [index, candidate] of plan.candidates.entries()) {
    const sourcePath = path.join(rootDir, candidate.relativePath);
    const destinationPath = path.join(rootDir, candidate.destinationPath);

    if (candidate.kind === "image") {
      await convertToWebp(sourcePath, destinationPath);
    } else {
      await convertToOgg(sourcePath, destinationPath);
    }

    await fs.rm(sourcePath);

    const [destinationStat, destinationContent] = await Promise.all([
      fs.stat(destinationPath),
      fs.readFile(destinationPath),
    ]);
    const destinationHash = await hashBuffer(destinationContent);

    await db
      .deleteFrom("assets")
      .where("path", "=", toDbPath(dbPathPrefix, candidate.relativePath))
      .execute();
    await db
      .insertInto("assets")
      .values({
        path: toDbPath(dbPathPrefix, candidate.destinationPath),
        size: destinationStat.size,
        mtime: destinationStat.mtime,
        hash: destinationHash,
      })
      .onConflict((oc) =>
        oc.column("path").doUpdateSet({
          size: destinationStat.size,
          mtime: destinationStat.mtime,
          hash: destinationHash,
          scanned_at: new Date(),
        }),
      )
      .execute();

    onProgress?.({ done: index + 1, total });
  }

  if (plan.candidates.length > 0) {
    invalidateLocalHashIndex(db);
  }

  const overwritten = plan.candidates.filter((candidate) => candidate.willOverwrite).length;

  return { converted: plan.candidates.length, overwritten };
};
