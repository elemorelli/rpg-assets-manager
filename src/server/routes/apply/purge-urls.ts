import { joinUrl } from "#server/utils/url.ts";

import type { RenamePair } from "../diff/index.ts";

interface BatchChangeSet {
  added: string[];
  deleted: string[];
  modified: string[];
  renamed: RenamePair[];
}

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
