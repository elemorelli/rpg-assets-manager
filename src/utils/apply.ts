export type ApplyOutcome = "applied" | "dry_run";

export interface ApplyBatchSummary {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  outcome: ApplyOutcome;
  syncRunId: number;
}
