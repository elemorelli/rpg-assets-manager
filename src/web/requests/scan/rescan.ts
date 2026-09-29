import type { RescanSummary } from "#utils/rescan.ts";

import { jsonInit, requestJson } from "../http-client.ts";

export const rescan = (forceRehash = false): Promise<RescanSummary> =>
  requestJson<RescanSummary>("/api/rescan", jsonInit("POST", { forceRehash }));
