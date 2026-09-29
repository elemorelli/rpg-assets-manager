import type { RescanRequest, RescanSummary } from "#utils/rescan.ts";

import { jsonInit, requestJson } from "../http-client.ts";

export const rescan = (request: RescanRequest = {}): Promise<RescanSummary> => {
  const body = {
    forceRehash: request.forceRehash ?? false,
    removeEmptyFolders: request.removeEmptyFolders ?? false,
  };

  return requestJson<RescanSummary>("/api/rescan", jsonInit("POST", body));
};
