import type { ApplyBatchSummary } from "#utils/apply.ts";
import type { OperationScope } from "#utils/operation-scope.ts";

import { jsonInit, requestJson } from "../http-client.ts";

export const applyBatch = (path?: string, scope?: OperationScope): Promise<ApplyBatchSummary> =>
  requestJson<ApplyBatchSummary>(
    "/api/apply",
    path === undefined ? { method: "POST" } : jsonInit("POST", { path, scope }),
  );
