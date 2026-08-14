import { requestJson } from "../http-client.ts";

export interface ApplyBatchSummary {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  outcome: string;
  syncRunId: number;
}

export const applyBatch = (): Promise<ApplyBatchSummary> =>
  requestJson<ApplyBatchSummary>("/api/apply", { method: "POST" });
