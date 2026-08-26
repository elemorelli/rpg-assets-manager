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

export const isPreviewableEntry = (entry: PreviewableEntry): boolean =>
  resolvePreviewSource(entry).kind !== "none";

export const thumbnailCacheFileName = (hash: string): string => `${hash}.webp`;

export const buildRawFileUrl = (relativePath: string): string =>
  `/api/files/raw?path=${encodeURIComponent(relativePath)}`;

export const buildThumbnailUrl = (relativePath: string): string =>
  `/api/files/thumbnail?path=${encodeURIComponent(relativePath)}`;

export interface ParsedBrowserPath {
  directoryPath: string;
  deepLinkedFileName: string | null;
}

// The browser URL doesn't distinguish a folder segment from a deep-linked
// file, so we infer it from the last segment's extension: a folder can't be
// opened in the lightbox, so anything else must be treated as one.
export const parseBrowserPath = (rawPath: string): ParsedBrowserPath => {
  if (rawPath === "") {
    return { directoryPath: "", deepLinkedFileName: null };
  }

  const segments = rawPath.split("/");
  const lastSegment = segments[segments.length - 1];

  if (classifyPreviewKind(lastSegment) === "unsupported") {
    return { directoryPath: rawPath, deepLinkedFileName: null };
  }

  return {
    directoryPath: segments.slice(0, -1).join("/"),
    deepLinkedFileName: lastSegment,
  };
};
