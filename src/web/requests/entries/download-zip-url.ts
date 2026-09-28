export const buildZipDownloadUrl = (relativePaths: string[]): string => {
  const pathParams = relativePaths.map((relativePath) => ["path", relativePath]);
  const queryString = new URLSearchParams(pathParams).toString();

  return `/api/entries/download-zip?${queryString}`;
};
