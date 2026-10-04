import type { YoutubeImportRequest, YoutubeImportResult } from "#utils/youtube-import.ts";

import { jsonInit, requestJson } from "../http-client.ts";

export const importFromYoutube = (body: YoutubeImportRequest): Promise<YoutubeImportResult> =>
  requestJson<YoutubeImportResult>("/api/youtube/import", jsonInit("POST", body));
