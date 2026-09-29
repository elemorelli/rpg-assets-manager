import fs from "node:fs/promises";

import { type WalkDirectoryOptions, walkDirectory } from "#server/utils/walk-directory.ts";

interface WalkedFile {
  relativePath: string;
  size: number;
  mtimeMs: number;
}

export const walkAssetTree = async (
  rootDir: string,
  options: WalkDirectoryOptions = {},
  signal?: AbortSignal,
): Promise<WalkedFile[]> => {
  const entries = await walkDirectory(rootDir, options);
  const results: WalkedFile[] = [];

  for (const entry of entries) {
    // The stat is the slow part, so cancellation checks here; rescan.ts discards the truncated result.
    if (signal?.aborted) {
      break;
    }

    if (!entry.dirent.isFile()) {
      continue;
    }

    const stat = await fs.stat(entry.entryPath);

    // Truncated to match Postgres's millisecond precision, or unchanged files never compare equal.
    results.push({
      relativePath: entry.relativePath,
      size: stat.size,
      mtimeMs: Math.trunc(stat.mtimeMs),
    });
  }

  return results;
};
