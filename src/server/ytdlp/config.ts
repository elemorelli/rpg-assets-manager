const DEFAULT_YTDLP_BINARY = "yt-dlp";

// Read per call so tests can point it at a fake binary.
export const getYtdlpBinary = (): string => process.env.YTDLP_PATH ?? DEFAULT_YTDLP_BINARY;
