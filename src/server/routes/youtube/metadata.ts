import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import { fetchYoutubeMetadata } from "#server/ytdlp/index.ts";
import { INVALID_YOUTUBE_URL_MESSAGE, isAllowedYoutubeUrl } from "#utils/youtube-import.ts";

interface MetadataQuery {
  url?: string;
}

export const youtubeMetadataHandler = withHttpErrorHandling(async (request) => {
  const url = (request.query as MetadataQuery).url ?? "";

  if (!isAllowedYoutubeUrl(url)) {
    throw new HttpError(INVALID_YOUTUBE_URL_MESSAGE, HTTP_STATUS.badRequest);
  }

  return await fetchYoutubeMetadata(url);
});
