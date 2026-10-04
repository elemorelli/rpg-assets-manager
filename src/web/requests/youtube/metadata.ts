import type { YoutubeMetadata } from "#utils/youtube-import.ts";

import { requestJson } from "../http-client.ts";

export const fetchYoutubeMetadata = (url: string): Promise<YoutubeMetadata> =>
  requestJson<YoutubeMetadata>(`/api/youtube/metadata?url=${encodeURIComponent(url)}`);
