import { type JSX, useMemo, useState } from "react";

import { Button } from "#components/button/button.tsx";
import { DiffTable } from "#components/diff-table/diff-table.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import { ScopeSelector } from "#components/scope-selector/scope-selector.tsx";
import type { OperationScope } from "#utils/operation-scope.ts";
import type { ConversionPlan } from "#web/requests/convert/plan/conversion.ts";
import * as api from "#web/requests/index.ts";
import { buildConversionDiffRows } from "#web/utils/diff-rows.ts";
import { describeScopedTitle } from "#web/utils/scope-title.ts";
import { useBusyAction } from "#web/utils/use-busy-action.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./convert-modal.module.css";

export interface ConvertModalProps {
  currentPath: string;
  onClose: () => void;
  onConverted: () => void;
}

export const ConvertModal = ({
  currentPath,
  onClose,
  onConverted,
}: ConvertModalProps): JSX.Element => {
  const [scope, setScope] = useState<OperationScope>("folder");
  const directoryLabel = currentPath === "" ? "root" : currentPath;

  const {
    data: plan,
    message,
    setMessage,
  } = useFetchOnMount<ConversionPlan>(
    () => api.fetchConversionPlan(currentPath, scope),
    [currentPath, scope],
  );
  const { busy, runBusyAction } = useBusyAction(setMessage);

  const handleConvert = (): void => {
    runBusyAction(() =>
      api.convert(currentPath, scope).then(() => {
        onConverted();
        onClose();
      }),
    );
  };

  const hasNothingToConvert = plan !== null && plan.candidates.length === 0;
  const candidateRows = useMemo(
    () => (plan ? buildConversionDiffRows(plan.candidates) : []),
    [plan],
  );

  const footer =
    plan && plan.candidates.length > 0 ? (
      <>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={busy} onClick={handleConvert}>
          {`Convert ${plan.candidates.length} file(s)`}
        </Button>
      </>
    ) : (
      <Button variant="secondary" disabled={busy} onClick={onClose}>
        Close
      </Button>
    );

  return (
    <Modal
      title={describeScopedTitle("Convert assets", scope, directoryLabel)}
      onClose={onClose}
      footer={footer}>
      <ScopeSelector scope={scope} onScopeChange={setScope} directoryLabel={directoryLabel} />
      {message && <MessageBanner message={message} />}
      {!plan && !message && <p>Checking for conversions...</p>}
      {hasNothingToConvert && <p>Nothing to convert.</p>}
      {plan && !hasNothingToConvert && (
        <div className={styles.section}>
          <p className={styles.summary}>{`${plan.candidates.length} file(s) to convert:`}</p>
          <DiffTable rows={candidateRows} />
        </div>
      )}
    </Modal>
  );
};
