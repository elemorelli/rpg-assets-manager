import { rcloneCopy, rcloneDelete, rcloneMoveTo } from "../../rclone/index.ts";
import type { BatchDiffResult } from "../diff/index.ts";

export interface RcloneOperationsProgress {
  done: number;
  total: number;
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
    await rcloneCopy(rootDir, destinationRoot, toCopy);
    done += 1;
    onProgress?.({ done, total });
  }

  if (diff.deleted.length > 0) {
    await rcloneDelete(destinationRoot, diff.deleted);
    done += 1;
    onProgress?.({ done, total });
  }

  for (const pair of diff.renamed) {
    await rcloneMoveTo(destinationRoot, pair.oldPath, pair.newPath);
    done += 1;
    onProgress?.({ done, total });
  }
};
