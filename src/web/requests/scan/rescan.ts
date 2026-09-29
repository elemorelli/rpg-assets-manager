import type { RescanRequest, RescanSummary } from "#utils/rescan.ts";

import { jsonInit, requestJson } from "../http-client.ts";

// The server defaults every omitted option to false, so the request goes out as-is.
export const rescan = (request: RescanRequest): Promise<RescanSummary> =>
  requestJson<RescanSummary>("/api/rescan", jsonInit("POST", request));
