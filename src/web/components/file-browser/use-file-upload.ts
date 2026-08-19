import { useRef, useState } from "react";

import { joinRelativePath, parentDirectory } from "#utils/paths.ts";
import { ApiError } from "#web/requests/http-client.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";
import type { DroppedFile } from "#web/utils/read-dropped-files.ts";

const CONFLICT_STATUS = 409;
const MIN_FILES_FOR_PROGRESS = 2;

const isConflictError = (error: unknown): boolean =>
  error instanceof ApiError && error.statusCode === CONFLICT_STATUS;

interface UploadItem {
  file: File;
  targetDir: string;
  displayName: string;
}

export interface UploadProgress {
  done: number;
  total: number;
  detail: string;
}

export interface UseFileUploadParams {
  currentPath: string;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  loadDirectory: (path: string) => Promise<void>;
}

export interface UseFileUploadResult {
  handleUploadFile: (file: File) => void;
  handleFilesDropped: (files: DroppedFile[]) => void;
  uploadProgress: UploadProgress | null;
  conflictingFileNames: string[] | null;
  confirmOverwrite: () => void;
  cancelOverwrite: () => void;
}

export const useFileUpload = ({
  currentPath,
  setBusy,
  setError,
  loadDirectory,
}: UseFileUploadParams): UseFileUploadResult => {
  const [conflictingItems, setConflictingItems] = useState<UploadItem[] | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const overwriteDecisionRef = useRef<((overwrite: boolean) => void) | null>(null);

  const askToOverwrite = (items: UploadItem[]): Promise<boolean> =>
    new Promise((resolve) => {
      overwriteDecisionRef.current = resolve;
      setConflictingItems(items);
    });

  const resolveOverwriteDecision = (overwrite: boolean): void => {
    overwriteDecisionRef.current?.(overwrite);
    overwriteDecisionRef.current = null;
    setConflictingItems(null);
  };

  const confirmOverwrite = (): void => resolveOverwriteDecision(true);
  const cancelOverwrite = (): void => resolveOverwriteDecision(false);

  const resolveTargetDir = (relativePath: string): string => {
    const parent = parentDirectory(relativePath);

    return parent ? joinRelativePath(currentPath, parent) : currentPath;
  };

  const reportProgress = (done: number, total: number, item: UploadItem): void => {
    if (total >= MIN_FILES_FOR_PROGRESS) {
      setUploadProgress({ done, total, detail: item.displayName });
    }
  };

  const uploadBatch = async (items: UploadItem[]): Promise<void> => {
    let successCount = 0;
    const conflicts: UploadItem[] = [];
    let errorMessage: string | null = null;

    for (const [index, item] of items.entries()) {
      reportProgress(index, items.length, item);

      try {
        await api.uploadFile(item.targetDir, item.file);
        successCount += 1;
      } catch (caught) {
        if (isConflictError(caught)) {
          conflicts.push(item);
          continue;
        }

        errorMessage = `Uploaded ${successCount} of ${items.length} before failing on "${item.displayName}": ${describeError(caught)}`;
        break;
      }
    }

    setUploadProgress(null);

    if (errorMessage === null && conflicts.length > 0) {
      const overwriteConfirmed = await askToOverwrite(conflicts);

      if (overwriteConfirmed) {
        for (const [index, item] of conflicts.entries()) {
          reportProgress(index, conflicts.length, item);

          try {
            await api.uploadFile(item.targetDir, item.file, true);
            successCount += 1;
          } catch (caught) {
            errorMessage = `Uploaded ${successCount} of ${items.length} before failing on "${item.displayName}": ${describeError(caught)}`;
            break;
          }
        }

        setUploadProgress(null);
      } else {
        const skippedNames = conflicts.map((item) => item.displayName).join(", ");

        errorMessage = `Skipped ${conflicts.length} file(s) that already exist: ${skippedNames}`;
      }
    }

    await loadDirectory(currentPath);

    if (errorMessage) {
      setError(errorMessage);
    }
  };

  const runUpload = (items: UploadItem[]): void => {
    setBusy(true);
    setError(null);

    void uploadBatch(items);
  };

  const handleUploadFile = (file: File): void =>
    runUpload([{ file, targetDir: currentPath, displayName: file.name }]);

  const handleFilesDropped = (droppedFiles: DroppedFile[]): void =>
    runUpload(
      droppedFiles.map(({ file, relativePath }) => ({
        file,
        targetDir: resolveTargetDir(relativePath),
        displayName: relativePath,
      })),
    );

  return {
    handleUploadFile,
    handleFilesDropped,
    uploadProgress,
    conflictingFileNames: conflictingItems
      ? conflictingItems.map((item) => item.displayName)
      : null,
    confirmOverwrite,
    cancelOverwrite,
  };
};
