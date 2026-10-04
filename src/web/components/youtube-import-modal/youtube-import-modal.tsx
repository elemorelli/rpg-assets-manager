import { type JSX, useState } from "react";

import { Button } from "#components/button/button.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import { OverwriteConfirmModal } from "#components/overwrite-confirm-modal/overwrite-confirm-modal.tsx";
import {
  IMPORT_FILE_EXTENSION,
  INVALID_YOUTUBE_URL_MESSAGE,
  isAllowedYoutubeUrl,
  normalizeImportFileName,
  validateImportFileName,
  type YoutubeMetadata,
} from "#utils/youtube-import.ts";
import { ApiError } from "#web/requests/http-client.ts";
import * as api from "#web/requests/index.ts";
import type { Message } from "#web/utils/message.ts";
import { describeDirectoryLabel } from "#web/utils/scope-title.ts";
import { useBusyAction } from "#web/utils/use-busy-action.ts";

import { YoutubeImportDetails } from "./youtube-import-details.tsx";
import { YoutubeUrlStep } from "./youtube-url-step.tsx";

const HTTP_CONFLICT = 409;

export interface YoutubeImportModalProps {
  currentPath: string;
  availableTags: string[];
  onClose: () => void;
  onImported: () => void;
}

const isConflictError = (caught: unknown): boolean =>
  caught instanceof ApiError && caught.statusCode === HTTP_CONFLICT;

export const YoutubeImportModal = ({
  currentPath,
  availableTags,
  onClose,
  onImported,
}: YoutubeImportModalProps): JSX.Element => {
  const [url, setUrl] = useState<string>("");
  const [metadata, setMetadata] = useState<YoutubeMetadata | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState<boolean>(false);
  const { busy, runBusyAction } = useBusyAction(setMessage);

  const trimmedUrl = url.trim();
  const normalizedFileName = normalizeImportFileName(fileName);
  const fileNameError = validateImportFileName(normalizedFileName);

  const handleFetch = (): void => {
    if (!isAllowedYoutubeUrl(trimmedUrl)) {
      setMessage({ severity: "error", summary: INVALID_YOUTUBE_URL_MESSAGE });

      return;
    }

    runBusyAction(async () => {
      const fetched = await api.fetchYoutubeMetadata(trimmedUrl);

      setMetadata(fetched);
      setFileName(fetched.suggestedFileName);
    });
  };

  const runImport = (overwrite: boolean): void => {
    runBusyAction(async () => {
      try {
        const result = await api.importFromYoutube({
          url: trimmedUrl,
          directoryPath: currentPath,
          fileName: normalizedFileName,
          tags,
          overwrite,
        });

        if (result.imported !== null) {
          onImported();
        }

        onClose();
      } catch (caught) {
        if (isConflictError(caught)) {
          setConfirmingOverwrite(true);

          return;
        }

        throw caught;
      }
    });
  };

  const handleConfirmOverwrite = (): void => {
    setConfirmingOverwrite(false);
    runImport(true);
  };

  const primaryButton = metadata ? (
    <Button
      variant="primary"
      disabled={busy || fileNameError !== null}
      onClick={() => runImport(false)}>
      Import
    </Button>
  ) : (
    <Button variant="primary" disabled={busy} onClick={handleFetch}>
      Fetch
    </Button>
  );

  const footer = (
    <>
      <Button variant="secondary" disabled={busy} onClick={onClose}>
        Cancel
      </Button>
      {primaryButton}
    </>
  );

  return (
    <Modal title="Import from YouTube" onClose={onClose} footer={footer}>
      {message && <MessageBanner message={message} />}
      {metadata ? (
        <YoutubeImportDetails
          metadata={metadata}
          fileName={fileName}
          fileNameError={fileNameError}
          onFileNameChange={setFileName}
          tags={tags}
          availableTags={availableTags}
          onTagsChange={setTags}
          destinationLabel={describeDirectoryLabel(currentPath)}
        />
      ) : (
        <YoutubeUrlStep url={url} onUrlChange={setUrl} onSubmit={handleFetch} />
      )}
      {busy && !metadata && <p>Fetching video info...</p>}
      {confirmingOverwrite && (
        <OverwriteConfirmModal
          fileNames={[`${normalizedFileName}${IMPORT_FILE_EXTENSION}`]}
          onConfirm={handleConfirmOverwrite}
          onCancel={() => setConfirmingOverwrite(false)}
        />
      )}
    </Modal>
  );
};
