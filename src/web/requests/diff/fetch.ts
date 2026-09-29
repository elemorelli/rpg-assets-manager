import type { BatchDiff } from "#utils/diff.ts";
import type { OperationScope } from "#utils/operation-scope.ts";

import { requestJson } from "../http-client.ts";

export const fetchDiff = (path?: string, scope?: OperationScope): Promise<BatchDiff> => {
  if (path === undefined) {
    return requestJson<BatchDiff>("/api/diff");
  }

  const query = `path=${encodeURIComponent(path)}&scope=${encodeURIComponent(scope ?? "all")}`;

  return requestJson<BatchDiff>(`/api/diff?${query}`);
};
