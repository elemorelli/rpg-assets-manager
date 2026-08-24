import { type JSX, useMemo } from "react";

import { Button } from "#components/button/button.tsx";
import { Modal } from "#components/modal/modal.tsx";
import { ScrollList, type ScrollListRow } from "#components/scroll-list/scroll-list.tsx";

export interface OverwriteConfirmModalProps {
  fileNames: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

const buildFileRows = (fileNames: string[]): ScrollListRow[] =>
  fileNames.map((fileName) => ({ key: fileName, label: fileName }));

export const OverwriteConfirmModal = ({
  fileNames,
  onConfirm,
  onCancel,
}: OverwriteConfirmModalProps): JSX.Element => {
  const fileRows = useMemo(() => buildFileRows(fileNames), [fileNames]);

  const footer = (
    <>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        Overwrite
      </Button>
    </>
  );

  return (
    <Modal title="File already exists" onClose={onCancel} footer={footer} size="sm">
      <p>{`${fileNames.length} file(s) already exist at the destination:`}</p>
      <ScrollList rows={fileRows} />
    </Modal>
  );
};
