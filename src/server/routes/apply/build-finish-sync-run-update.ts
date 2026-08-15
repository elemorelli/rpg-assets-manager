import type { BatchDiffResult } from "../diff/index.ts";

export const buildFinishSyncRunUpdate = (
  outcome: "applied" | "dry_run",
  diff: BatchDiffResult,
  purgeUrls: string[],
  generatedMacro: string | null,
  worldAcknowledgements: Record<string, boolean>,
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
