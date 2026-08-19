import { rcloneCopy, rcloneDelete, rcloneMoveTo } from "#server/rclone/index.ts";

import type { BatchDiffResult } from "../diff/index.ts";

interface RcloneOperationsProgress {
  done: number;
  total: number;
  detail?: string;
}

export const countRcloneSteps = (diff: BatchDiffResult): number =>
  diff.added.length + diff.modified.length + diff.deleted.length + diff.renamed.length;

export const runRcloneOperations = async (
  rootDir: string,
  destinationRoot: string,
  diff: BatchDiffResult,
  onProgress?: (progress: RcloneOperationsProgress) => void,
): Promise<void> => {
  const toCopy = [...diff.added, ...diff.modified];
  const total = countRcloneSteps(diff);
  let done = 0;

  const reportFileDone = (relativePath: string): void => {
    done += 1;
    onProgress?.({ done, total, detail: relativePath });
  };

  if (toCopy.length > 0) {
    onProgress?.({ done, total, detail: `Copying ${toCopy.length} file(s)` });
    await rcloneCopy(rootDir, destinationRoot, toCopy, reportFileDone);
  }

  if (diff.deleted.length > 0) {
    onProgress?.({ done, total, detail: `Deleting ${diff.deleted.length} file(s)` });
    await rcloneDelete(destinationRoot, diff.deleted, reportFileDone);
  }

  for (const pair of diff.renamed) {
    onProgress?.({ done, total, detail: `Renaming ${pair.oldPath} → ${pair.newPath}` });
    await rcloneMoveTo(destinationRoot, pair.oldPath, pair.newPath);
    reportFileDone(pair.newPath);
  }
};
