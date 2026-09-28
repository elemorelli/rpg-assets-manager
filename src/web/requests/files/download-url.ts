export const buildFileDownloadUrl = (relativePath: string): string =>
  `/api/files/download?path=${encodeURIComponent(relativePath)}`;
