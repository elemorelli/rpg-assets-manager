import { rcloneCopy, rcloneDelete, rcloneMoveTo } from "#server/rclone/index.ts";

import type { BatchDiffResult } from "../diff/index.ts";

interface RcloneOperationsProgress {
  done: number;
  total: number;
  detail?: string;
}

export const countRcloneSteps = (diff: BatchDiffResult): number => {
  const toCopyCount = diff.added.length + diff.modified.length;

  return (toCopyCount > 0 ? 1 : 0) + (diff.deleted.length > 0 ? 1 : 0) + diff.renamed.length;
};

export const runRcloneOperations = async (
  rootDir: string,
  destinationRoot: string,
  diff: BatchDiffResult,
  onProgress?: (progress: RcloneOperationsProgress) => void,
): Promise<void> => {
  const toCopy = [...diff.added, ...diff.modified];
  const total = countRcloneSteps(diff);
  let done = 0;

  if (toCopy.length > 0) {
    onProgress?.({ done, total, detail: `Copying ${toCopy.length} file(s)` });
    await rcloneCopy(rootDir, destinationRoot, toCopy);
    done += 1;
    onProgress?.({ done, total });
  }

  if (diff.deleted.length > 0) {
    onProgress?.({ done, total, detail: `Deleting ${diff.deleted.length} file(s)` });
    await rcloneDelete(destinationRoot, diff.deleted);
    done += 1;
    onProgress?.({ done, total });
  }

  for (const pair of diff.renamed) {
    onProgress?.({ done, total, detail: `Renaming ${pair.oldPath} → ${pair.newPath}` });
    await rcloneMoveTo(destinationRoot, pair.oldPath, pair.newPath);
    done += 1;
    onProgress?.({ done, total });
  }
};
