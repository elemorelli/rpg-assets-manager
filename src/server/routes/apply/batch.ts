import type { Kysely } from "kysely";

import { invalidateRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import type { DB } from "#server/db/index.ts";

import { type BatchDiffResult, computeBatchDiff } from "../diff/index.ts";
import type { SyncRunWorldAcknowledgements } from "./build-finish-sync-run-update.ts";
import { generateMacro } from "./macro/generate-macro.ts";
import { mirrorRemoteAssets } from "./mirror-remote-assets.ts";
import { buildPurgeUrls } from "./purge-urls.ts";
import { countRcloneSteps, runRcloneOperations } from "./run-rclone-operations.ts";
import { failSyncRun, finishSyncRun, type SyncRunOutcome, startSyncRun } from "./sync-run.ts";

export interface ApplyProgress {
  done: number;
  total: number;
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
  foundryWorldNames: string[];
}

const buildInitialWorldAcknowledgements = (worldNames: string[]): SyncRunWorldAcknowledgements =>
  Object.fromEntries(worldNames.map((worldName) => [worldName, false]));

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
    await finishSyncRun(db, syncRunId, "dry_run", diff, purgeUrls, null, {});

    return summaryFor(diff, "dry_run", syncRunId);
  }

  try {
    await runRcloneOperations(deps.rootDir, deps.destinationRoot, diff, onProgress);
    await db.transaction().execute((trx) => mirrorRemoteAssets(trx, diff));
    invalidateRemoteHashIndex(db);
    await deps.purge(purgeUrls);

    const generatedMacro = generateMacro(diff.renamed, deps.baseUrl, deps.foundryWorldNames);
    const worldAcknowledgements = generatedMacro
      ? buildInitialWorldAcknowledgements(deps.foundryWorldNames)
      : {};

    await finishSyncRun(
      db,
      syncRunId,
      "applied",
      diff,
      purgeUrls,
      generatedMacro,
      worldAcknowledgements,
    );

    return summaryFor(diff, "applied", syncRunId);
  } catch (error) {
    await failSyncRun(db, syncRunId);

    throw error;
  }
};
