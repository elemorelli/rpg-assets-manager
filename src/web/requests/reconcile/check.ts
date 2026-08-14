import { requestJson } from "../http-client.ts";

export interface RcloneCheckResult {
  matchCount: number;
  missingOnSource: string[];
  missingOnDestination: string[];
  differs: string[];
  errors: string[];
}

export const reconcile = (): Promise<RcloneCheckResult> =>
  requestJson<RcloneCheckResult>("/api/reconcile", { method: "POST" });
