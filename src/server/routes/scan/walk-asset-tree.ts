import fs from "node:fs/promises";

import { walkDirectory } from "#server/utils/walk-directory.ts";

interface WalkedFile {
  relativePath: string;
  size: number;
  mtimeMs: number;
}

export const walkAssetTree = async (rootDir: string): Promise<WalkedFile[]> => {
  const entries = await walkDirectory(rootDir);
  const results: WalkedFile[] = [];

  for (const entry of entries) {
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
