import type { BatchDiffResult } from "../diff/index.ts";
import type { SyncRunOutcome } from "./sync-run.ts";

export type SyncRunWorldAcknowledgements = Record<string, boolean>;

export const buildFinishSyncRunUpdate = (
  outcome: Exclude<SyncRunOutcome, "in_progress" | "failed">,
  diff: BatchDiffResult,
  purgeUrls: string[],
  generatedMacro: string | null,
  worldAcknowledgements: SyncRunWorldAcknowledgements,
  finishedAt: Date,
) => ({
  finished_at: finishedAt,
  added_count: diff.added.length,
  modified_count: diff.modified.length,
  deleted_count: diff.deleted.length,
  renamed_count: diff.renamed.length,
  outcome,
  purged_urls: JSON.stringify(purgeUrls),
  generated_macro: generatedMacro,
  world_acknowledgements: JSON.stringify(worldAcknowledgements),
});
