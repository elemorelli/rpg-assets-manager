import type { OperationScope } from "#utils/operation-scope.ts";

import { jsonInit, requestJson } from "../http-client.ts";

export interface ApplyBatchSummary {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  outcome: "applied" | "dry_run";
  syncRunId: number;
}

export const applyBatch = (path?: string, scope?: OperationScope): Promise<ApplyBatchSummary> =>
  requestJson<ApplyBatchSummary>(
    "/api/apply",
    path === undefined ? { method: "POST" } : jsonInit("POST", { path, scope }),
  );
