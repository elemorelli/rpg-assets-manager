import type { Kysely } from "kysely";

import { invalidateRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import {
  assetsPublicBaseUrl,
  cloudflareConfig,
  purgeCloudflareCache,
} from "#server/cloudflare/index.ts";
import { type DB, db } from "#server/db/index.ts";
import { rcloneDestination } from "#server/rclone/index.ts";

import { type BatchDiffResult, computeBatchDiff } from "../diff/index.ts";
import { runTrackedJob } from "../jobs/index.ts";
import { dryRun } from "./config.ts";
import { mirrorRemoteAssets } from "./mirror-remote-assets.ts";
import { buildPurgeUrls } from "./purge-urls.ts";
import { recordAssetRenames } from "./record-asset-renames.ts";
import { countRcloneSteps, runRcloneOperations } from "./run-rclone-operations.ts";
import { failSyncRun, finishSyncRun, type SyncRunOutcome, startSyncRun } from "./sync-run.ts";

export interface ApplyProgress {
  done: number;
  total: number;
  detail?: string;
}

export type ApplyOutcome = Exclude<SyncRunOutcome, "in_progress" | "failed">;

export interface ApplyBatchSummary {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  outcome: ApplyOutcome;
  syncRunId: number;
}

export interface ApplyBatchDependencies {
  rootDir: string;
  destinationRoot: string;
  baseUrl: string;
  dryRun: boolean;
  purge: (urls: string[]) => Promise<void>;
}

const summaryFor = (
  diff: BatchDiffResult,
  outcome: ApplyOutcome,
  syncRunId: number,
): ApplyBatchSummary => ({
  added: diff.added.length,
  modified: diff.modified.length,
  deleted: diff.deleted.length,
  renamed: diff.renamed.length,
  outcome,
  syncRunId,
});

export const applyBatch = async (
  db: Kysely<DB>,
  deps: ApplyBatchDependencies,
  onProgress?: (progress: ApplyProgress) => void,
): Promise<ApplyBatchSummary> => {
  const diff = await computeBatchDiff(db);
  const purgeUrls = buildPurgeUrls(diff, deps.baseUrl);
  const total = countRcloneSteps(diff);

  const syncRunId = await startSyncRun(db);

  onProgress?.({ done: 0, total });

  if (deps.dryRun) {
    await finishSyncRun(db, syncRunId, "dry_run", diff, purgeUrls);

    return summaryFor(diff, "dry_run", syncRunId);
  }

  try {
    await runRcloneOperations(deps.rootDir, deps.destinationRoot, diff, onProgress);
    await db.transaction().execute(async (trx) => {
      await mirrorRemoteAssets(trx, diff);
      await recordAssetRenames(trx, diff.renamed);
    });
    invalidateRemoteHashIndex(db);
    await deps.purge(purgeUrls);

    await finishSyncRun(db, syncRunId, "applied", diff, purgeUrls);

    return summaryFor(diff, "applied", syncRunId);
  } catch (error) {
    await failSyncRun(db, syncRunId);

    throw error;
  }
};

export const applyBatchHandler = (assetTreeRoot: string) => async () => {
  const purge = async (urls: string[]): Promise<void> => {
    if (!cloudflareConfig) {
      return;
    }

    await purgeCloudflareCache(urls, cloudflareConfig);
  };

  return runTrackedJob("sync", "applying", "sync failed", (onProgress) =>
    applyBatch(
      db,
      {
        rootDir: assetTreeRoot,
        destinationRoot: rcloneDestination,
        baseUrl: assetsPublicBaseUrl,
        dryRun,
        purge,
      },
      onProgress,
    ),
  );
};
