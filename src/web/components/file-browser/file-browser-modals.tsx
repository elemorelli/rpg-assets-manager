import type { JSX } from "react";

import { ConvertModal } from "#components/convert-modal/convert-modal.tsx";
import { FoundryModal } from "#components/foundry-modal/foundry-modal.tsx";
import { OverwriteConfirmModal } from "#components/overwrite-confirm-modal/overwrite-confirm-modal.tsx";
import { ReconciliationModal } from "#components/reconciliation-modal/reconciliation-modal.tsx";
import { SyncModal } from "#components/sync-modal/sync-modal.tsx";

export interface FileBrowserModalsProps {
  currentPath: string;
  isConvertModalOpen: boolean;
  onCloseConvertModal: () => void;
  onConverted: () => void;
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
    {isSyncModalOpen && <SyncModal onClose={onCloseSyncModal} onApplied={onSyncApplied} />}
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
