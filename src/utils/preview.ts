export type PreviewKind = "image" | "audio" | "unsupported";

const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const AUDIO_MIME_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
};

export const extensionOf = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
};

export const mimeTypeForFile = (fileName: string): string | undefined => {
  const extension = extensionOf(fileName);

  return IMAGE_MIME_TYPES[extension] ?? AUDIO_MIME_TYPES[extension];
};

export const classifyPreviewKind = (fileName: string): PreviewKind => {
  const extension = extensionOf(fileName);

  if (extension in IMAGE_MIME_TYPES) {
    return "image";
  }

  if (extension in AUDIO_MIME_TYPES) {
    return "audio";
  }

  return "unsupported";
};

const KILOBYTE = 1024;
const THUMBNAIL_THRESHOLD_KILOBYTES = 500;

export const THUMBNAIL_THRESHOLD_BYTES = THUMBNAIL_THRESHOLD_KILOBYTES * KILOBYTE;

export const shouldServeThumbnail = (sizeBytes: number): boolean =>
  sizeBytes > THUMBNAIL_THRESHOLD_BYTES;

export interface PreviewableEntry {
  type: "file" | "directory";
  name: string;
  size?: number;
}

export type PreviewSource =
  | { kind: "image"; useThumbnail: boolean }
  | { kind: "audio" }
  | { kind: "none" };

export const resolvePreviewSource = (entry: PreviewableEntry): PreviewSource => {
  if (entry.type !== "file") {
    return { kind: "none" };
  }

  const previewKind = classifyPreviewKind(entry.name);

  if (previewKind === "image") {
    const useThumbnail = entry.size !== undefined && shouldServeThumbnail(entry.size);

    return { kind: "image", useThumbnail };
  }

  if (previewKind === "audio") {
    return { kind: "audio" };
  }

  return { kind: "none" };
};

export const thumbnailCacheFileName = (hash: string): string => `${hash}.webp`;

export const buildRawFileUrl = (relativePath: string): string =>
  `/api/files/raw?path=${encodeURIComponent(relativePath)}`;

export const buildThumbnailUrl = (relativePath: string): string =>
  `/api/files/thumbnail?path=${encodeURIComponent(relativePath)}`;
