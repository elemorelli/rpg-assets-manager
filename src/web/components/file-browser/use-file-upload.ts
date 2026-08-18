import { useRef, useState } from "react";

import { ApiError } from "#web/requests/http-client.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";

const CONFLICT_STATUS = 409;

const isConflictError = (error: unknown): boolean =>
  error instanceof ApiError && error.statusCode === CONFLICT_STATUS;

export interface UseFileUploadParams {
  currentPath: string;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  loadDirectory: (path: string) => Promise<void>;
}

export interface UseFileUploadResult {
  handleUploadFile: (file: File) => void;
  handleFilesDropped: (files: File[]) => void;
  conflictingFiles: File[] | null;
  confirmOverwrite: () => void;
  cancelOverwrite: () => void;
}

export const useFileUpload = ({
  currentPath,
  setBusy,
  setError,
  loadDirectory,
}: UseFileUploadParams): UseFileUploadResult => {
  const [conflictingFiles, setConflictingFiles] = useState<File[] | null>(null);
  const overwriteDecisionRef = useRef<((overwrite: boolean) => void) | null>(null);

  const askToOverwrite = (files: File[]): Promise<boolean> =>
    new Promise((resolve) => {
      overwriteDecisionRef.current = resolve;
      setConflictingFiles(files);
    });

  const resolveOverwriteDecision = (overwrite: boolean): void => {
    overwriteDecisionRef.current?.(overwrite);
    overwriteDecisionRef.current = null;
    setConflictingFiles(null);
  };

  const confirmOverwrite = (): void => resolveOverwriteDecision(true);
  const cancelOverwrite = (): void => resolveOverwriteDecision(false);

  const uploadBatch = async (files: File[]): Promise<void> => {
    let successCount = 0;
    const conflicts: File[] = [];
    let errorMessage: string | null = null;

    for (const file of files) {
      try {
        await api.uploadFile(currentPath, file);
        successCount += 1;
      } catch (caught) {
        if (isConflictError(caught)) {
          conflicts.push(file);
          continue;
        }

        errorMessage = `Uploaded ${successCount} of ${files.length} before failing on "${file.name}": ${describeError(caught)}`;
        break;
      }
    }

    if (errorMessage === null && conflicts.length > 0) {
      const overwriteConfirmed = await askToOverwrite(conflicts);

      if (overwriteConfirmed) {
        for (const file of conflicts) {
          try {
            await api.uploadFile(currentPath, file, true);
            successCount += 1;
          } catch (caught) {
            errorMessage = `Uploaded ${successCount} of ${files.length} before failing on "${file.name}": ${describeError(caught)}`;
            break;
          }
        }
      } else {
        const skippedNames = conflicts.map((file) => file.name).join(", ");

        errorMessage = `Skipped ${conflicts.length} file(s) that already exist: ${skippedNames}`;
      }
    }

    await loadDirectory(currentPath);

    if (errorMessage) {
      setError(errorMessage);
    }
  };

  const runUpload = (files: File[]): void => {
    setBusy(true);
    setError(null);

    void uploadBatch(files);
  };

  const handleUploadFile = (file: File): void => runUpload([file]);
  const handleFilesDropped = (files: File[]): void => runUpload(files);

  return {
    handleUploadFile,
    handleFilesDropped,
    conflictingFiles,
    confirmOverwrite,
    cancelOverwrite,
  };
};
