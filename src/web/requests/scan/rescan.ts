import { jsonInit, requestJson } from "../http-client.ts";

export interface RescanSummary {
  hashed: number;
  unchanged: number;
  removed: number;
  renamed: number;
}

export const rescan = (forceRehash = false): Promise<RescanSummary> =>
  requestJson<RescanSummary>("/api/rescan", jsonInit("POST", { forceRehash }));
