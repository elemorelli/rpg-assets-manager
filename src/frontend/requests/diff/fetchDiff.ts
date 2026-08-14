import { requestJson } from "./httpClient.ts";

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

export const fetchDiff = (): Promise<BatchDiff> => requestJson<BatchDiff>("/api/diff");
