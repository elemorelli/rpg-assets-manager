import type { JobProgress } from "./job.ts";

export const INVALID_YOUTUBE_URL_MESSAGE = "Not a YouTube URL";
export const IMPORT_FILE_EXTENSION = ".ogg";
export const YTDLP_PROGRESS_PREFIX = "rpgassets-progress:";
export const YTDLP_PROGRESS_TEMPLATE = `download:${YTDLP_PROGRESS_PREFIX}%(progress.downloaded_bytes)s/%(progress.total_bytes,progress.total_bytes_estimate)s`;

const ALLOWED_YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);
const REQUIRED_PROTOCOL = "https:";

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;
const MAX_SUGGESTED_FILE_NAME_LENGTH = 80;
const TYPED_EXTENSION = /\.ogg$/i;
const SLASHES = /[/\\]/;
const ERROR_LINE_PREFIX = "ERROR: ";
const GENERIC_YTDLP_ERROR = "yt-dlp failed";

export interface YoutubeMetadata {
  videoId: string;
  title: string;
  durationSeconds: number;
  suggestedFileName: string;
}

export interface YoutubeImportRequest {
  url: string;
  directoryPath: string;
  fileName: string;
  tags: string[];
  overwrite: boolean;
}

export interface YoutubeImportResult {
  imported: string | null;
}

export const isAllowedYoutubeUrl = (rawUrl: string): boolean => {
  if (!URL.canParse(rawUrl)) {
    return false;
  }

  const parsed = new URL(rawUrl);

  if (parsed.protocol !== REQUIRED_PROTOCOL) {
    return false;
  }

  return ALLOWED_YOUTUBE_HOSTS.has(parsed.hostname);
};

const slugify = (text: string): string => {
  const withoutAccents = text.normalize("NFKD").replace(COMBINING_MARKS, "");
  const dashed = withoutAccents.toLowerCase().replace(NON_SLUG_CHARACTERS, "-");

  return dashed.replace(EDGE_DASHES, "");
};

export const suggestFileName = (title: string, fallback: string): string => {
  const slug = slugify(title);
  const capped = slug.slice(0, MAX_SUGGESTED_FILE_NAME_LENGTH).replace(EDGE_DASHES, "");

  if (capped.length === 0) {
    return fallback;
  }

  return capped;
};

export const normalizeImportFileName = (fileName: string): string =>
  fileName.trim().replace(TYPED_EXTENSION, "");

export const validateImportFileName = (fileName: string): string | null => {
  if (fileName.length === 0) {
    return "File name is required";
  }

  if (SLASHES.test(fileName)) {
    return "File name cannot contain slashes";
  }

  if (fileName.startsWith(".")) {
    return "File name cannot start with a dot";
  }

  return null;
};

export const parseYtdlpProgressLine = (line: string): JobProgress | undefined => {
  if (!line.startsWith(YTDLP_PROGRESS_PREFIX)) {
    return undefined;
  }

  const [downloadedText, totalText] = line.slice(YTDLP_PROGRESS_PREFIX.length).trim().split("/");
  const downloaded = Number(downloadedText);
  const total = Number(totalText);
  const hasUsableNumbers = Number.isFinite(downloaded) && Number.isFinite(total) && total > 0;

  if (!hasUsableNumbers) {
    return undefined;
  }

  return { done: Math.round(downloaded), total: Math.round(total) };
};

interface RawYtdlpMetadata {
  id?: unknown;
  title?: unknown;
  duration?: unknown;
  is_live?: unknown;
}

export const parseYtdlpMetadata = (raw: unknown): YoutubeMetadata => {
  const metadata = (raw ?? {}) as RawYtdlpMetadata;

  if (typeof metadata.id !== "string" || typeof metadata.title !== "string") {
    throw new Error("Unreadable video info");
  }

  if (metadata.is_live === true) {
    throw new Error("Live streams cannot be imported");
  }

  if (typeof metadata.duration !== "number") {
    throw new Error("Video has no duration");
  }

  return {
    videoId: metadata.id,
    title: metadata.title,
    durationSeconds: metadata.duration,
    suggestedFileName: suggestFileName(metadata.title, metadata.id),
  };
};

export const extractYtdlpErrorMessage = (stderr: string): string => {
  const errorLines = stderr.split("\n").filter((line) => line.startsWith(ERROR_LINE_PREFIX));
  const lastErrorLine = errorLines.at(-1);

  if (lastErrorLine === undefined) {
    return GENERIC_YTDLP_ERROR;
  }

  return lastErrorLine.slice(ERROR_LINE_PREFIX.length);
};
