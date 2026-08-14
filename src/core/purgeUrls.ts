export interface BatchChangeSet {
  added: string[];
  deleted: string[];
  modified: string[];
  renamed: { oldPath: string; newPath: string }[];
}

const joinUrl = (baseUrl: string, relativePath: string): string => {
  const trimmedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return `${trimmedBaseUrl}/${relativePath}`;
};

export const buildPurgeUrls = (changeSet: BatchChangeSet, baseUrl: string): string[] => {
  const relativePaths = [
    ...changeSet.added,
    ...changeSet.modified,
    ...changeSet.deleted,
    ...changeSet.renamed.flatMap((pair) => [pair.oldPath, pair.newPath]),
  ];

  const uniqueRelativePaths = [...new Set(relativePaths)];

  return uniqueRelativePaths.map((relativePath) => joinUrl(baseUrl, relativePath));
};
