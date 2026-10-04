import type { JSX } from "react";

import { ConvertModal } from "#components/convert-modal/convert-modal.tsx";
import { FoundryModal } from "#components/foundry-modal/foundry-modal.tsx";
import { OverwriteConfirmModal } from "#components/overwrite-confirm-modal/overwrite-confirm-modal.tsx";
import { ReconciliationModal } from "#components/reconciliation-modal/reconciliation-modal.tsx";
import { SyncModal } from "#components/sync-modal/sync-modal.tsx";
import { YoutubeImportModal } from "#components/youtube-import-modal/youtube-import-modal.tsx";

export interface FileBrowserModalsProps {
  currentPath: string;
  isConvertModalOpen: boolean;
  onCloseConvertModal: () => void;
  onConverted: () => void;
  isYoutubeImportModalOpen: boolean;
  onCloseYoutubeImportModal: () => void;
  onYoutubeImported: () => void;
  availableTags: string[];
  isSyncModalOpen: boolean;
  onCloseSyncModal: () => void;
  onSyncApplied: () => void;
  isReconciliationModalOpen: boolean;
  onCloseReconciliationModal: () => void;
  isFoundryModalOpen: boolean;
  onCloseFoundryModal: () => void;
  onFoundryMarkedApplied: () => void;
  conflictingFileNames: string[] | null;
  onConfirmOverwrite: () => void;
  onCancelOverwrite: () => void;
}

export const FileBrowserModals = ({
  currentPath,
  isConvertModalOpen,
  onCloseConvertModal,
  onConverted,
  isYoutubeImportModalOpen,
  onCloseYoutubeImportModal,
  onYoutubeImported,
  availableTags,
  isSyncModalOpen,
  onCloseSyncModal,
  onSyncApplied,
  isReconciliationModalOpen,
  onCloseReconciliationModal,
  isFoundryModalOpen,
  onCloseFoundryModal,
  onFoundryMarkedApplied,
  conflictingFileNames,
  onConfirmOverwrite,
  onCancelOverwrite,
}: FileBrowserModalsProps): JSX.Element => (
  <>
    {isConvertModalOpen && (
      <ConvertModal
        currentPath={currentPath}
        onClose={onCloseConvertModal}
        onConverted={onConverted}
      />
    )}
    {isYoutubeImportModalOpen && (
      <YoutubeImportModal
        currentPath={currentPath}
        availableTags={availableTags}
        onClose={onCloseYoutubeImportModal}
        onImported={onYoutubeImported}
      />
    )}
    {isSyncModalOpen && (
      <SyncModal currentPath={currentPath} onClose={onCloseSyncModal} onApplied={onSyncApplied} />
    )}
    {isReconciliationModalOpen && <ReconciliationModal onClose={onCloseReconciliationModal} />}
    {isFoundryModalOpen && (
      <FoundryModal onClose={onCloseFoundryModal} onMarkedApplied={onFoundryMarkedApplied} />
    )}
    {conflictingFileNames && (
      <OverwriteConfirmModal
        fileNames={conflictingFileNames}
        onConfirm={onConfirmOverwrite}
        onCancel={onCancelOverwrite}
      />
    )}
  </>
);
