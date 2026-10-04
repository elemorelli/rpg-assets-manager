import path from "node:path";

import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { normalizeTags } from "#server/utils/tags.ts";
import {
  IMPORT_FILE_EXTENSION,
  INVALID_YOUTUBE_URL_MESSAGE,
  isAllowedYoutubeUrl,
  normalizeImportFileName,
  validateImportFileName,
  type YoutubeImportRequest,
} from "#utils/youtube-import.ts";

export interface YoutubeImportTarget {
  url: string;
  relativePath: string;
  tags: string[];
  overwrite: boolean;
}

const readString = (value: unknown): string => (typeof value === "string" ? value : "");

const readTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is string => typeof tag === "string");
};

export const resolveImportTarget = (
  body: Partial<YoutubeImportRequest> | undefined,
): YoutubeImportTarget => {
  const url = readString(body?.url);

  if (!isAllowedYoutubeUrl(url)) {
    throw new HttpError(INVALID_YOUTUBE_URL_MESSAGE, HTTP_STATUS.badRequest);
  }

  const fileName = normalizeImportFileName(readString(body?.fileName));
  const fileNameError = validateImportFileName(fileName);

  if (fileNameError !== null) {
    throw new HttpError(fileNameError, HTTP_STATUS.badRequest);
  }

  const directoryPath = resolveSafeRelativePath(readString(body?.directoryPath));
  const relativePath = path.posix.join(directoryPath, `${fileName}${IMPORT_FILE_EXTENSION}`);

  return {
    url,
    relativePath,
    tags: normalizeTags(readTags(body?.tags)),
    overwrite: body?.overwrite === true,
  };
};
