import type { Kysely } from "kysely";
import { failJob, startJob } from "../../core/job.ts";
import { buildPurgeUrls } from "../../core/purgeUrls.ts";
import {
  assetsPublicBaseUrl,
  cloudflareConfig,
  purgeCloudflareCache,
} from "../cloudflare/index.ts";
import { type DB, db } from "../db/index.ts";
import { type BatchDiffResult, computeBatchDiff } from "../diff/index.ts";
import { setCurrentJob } from "../jobs/jobStore.ts";
import { rcloneDestination } from "../rclone/index.ts";
import { dryRun } from "./config.ts";
import { mirrorRemoteAssets } from "./mirrorRemoteAssets.ts";
import { countRcloneSteps, runRcloneOperations } from "./runRcloneOperations.ts";
import { failSyncRun, finishSyncRun, startSyncRun } from "./syncRun.ts";

export interface ApplyProgress {
  done: number;
  total: number;
}

export type ApplyOutcome = "applied" | "dry_run";

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
    await db.transaction().execute((trx) => mirrorRemoteAssets(trx, diff));
    await deps.purge(purgeUrls);
    await finishSyncRun(db, syncRunId, "applied", diff, purgeUrls);

    return summaryFor(diff, "applied", syncRunId);
  } catch (error) {
    await failSyncRun(db, syncRunId);

    throw error;
  }
};

export const applyBatchHandler = (assetTreeRoot: string) => async () => {
  let job = startJob("apply", "applying", 0);
  setCurrentJob(job);

  const purge = async (urls: string[]): Promise<void> => {
    if (!cloudflareConfig) {
      return;
    }

    await purgeCloudflareCache(urls, cloudflareConfig);
  };

  try {
    const summary = await applyBatch(
      db,
      {
        rootDir: assetTreeRoot,
        destinationRoot: rcloneDestination,
        baseUrl: assetsPublicBaseUrl,
        dryRun,
        purge,
      },
      (progress) => {
        job = { ...job, total: progress.total, done: progress.done };
        setCurrentJob(job);
      },
    );

    setCurrentJob(null);

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "apply failed";

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
