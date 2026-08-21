import type { OperationScope } from "#utils/operation-scope.ts";

import { requestJson } from "../http-client.ts";

export interface RenamePair {
  oldPath: string;
  newPath: string;
}

export interface AmbiguousWarning {
  hash: string;
  localPaths: string[];
  remotePaths: string[];
}

export interface BatchDiff {
  added: string[];
  deleted: string[];
  modified: string[];
  renamed: RenamePair[];
  ambiguousWarnings: AmbiguousWarning[];
}

export const fetchDiff = (path?: string, scope?: OperationScope): Promise<BatchDiff> => {
  if (path === undefined) {
    return requestJson<BatchDiff>("/api/diff");
  }

  const query = `path=${encodeURIComponent(path)}&scope=${encodeURIComponent(scope ?? "all")}`;

  return requestJson<BatchDiff>(`/api/diff?${query}`);
};
