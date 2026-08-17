import { requestJson } from "../http-client.ts";

export interface ApplyBatchSummary {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  outcome: "applied" | "dry_run";
  syncRunId: number;
}

export const applyBatch = (): Promise<ApplyBatchSummary> =>
  requestJson<ApplyBatchSummary>("/api/apply", { method: "POST" });
