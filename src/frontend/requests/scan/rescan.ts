import { jsonInit, requestJson } from "./httpClient.ts";

export interface RescanSummary {
  hashed: number;
  unchanged: number;
  removed: number;
}

export const rescan = (forceRehash = false): Promise<RescanSummary> =>
  requestJson<RescanSummary>("/api/rescan", jsonInit("POST", { forceRehash }));
