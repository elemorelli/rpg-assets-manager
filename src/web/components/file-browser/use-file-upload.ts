import { useState } from "react";

import { joinRelativePath, parentDirectory } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";
import { isConflictError } from "#web/utils/is-conflict-error.ts";
import type { DroppedFile } from "#web/utils/read-dropped-files.ts";

import { useOverwriteConfirmation } from "./use-overwrite-confirmation.ts";

const MIN_FILES_FOR_PROGRESS = 2;

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
  refreshDirectory: (path: string) => Promise<void>;
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
  refreshDirectory,
}: UseFileUploadParams): UseFileUploadResult => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const { conflictingFileNames, askToOverwrite, confirmOverwrite, cancelOverwrite } =
    useOverwriteConfirmation<UploadItem>();

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

    await refreshDirectory(currentPath);

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
    conflictingFileNames,
    confirmOverwrite,
    cancelOverwrite,
  };
};
