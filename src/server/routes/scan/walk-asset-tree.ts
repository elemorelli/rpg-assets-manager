import fs from "node:fs/promises";

import type { WalkDirectoryOptions } from "#server/utils/walk-directory.ts";
import { walkDirectory } from "#server/utils/walk-directory.ts";

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
    // The stat below is the expensive part of a walk over a large collection,
    // so this is where cancellation needs to land to be responsive. Any
    // resulting truncated list is safe because rescan.ts re-checks the signal
    // right after the walk, before this list is used to plan removals.
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
