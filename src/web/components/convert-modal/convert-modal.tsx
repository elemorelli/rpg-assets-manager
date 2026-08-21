import { type JSX, useMemo, useState } from "react";

import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import { Modal } from "#components/modal/modal.tsx";
import { ScopeSelector } from "#components/scope-selector/scope-selector.tsx";
import { ScrollList, type ScrollListRow } from "#components/scroll-list/scroll-list.tsx";
import type { OperationScope } from "#utils/operation-scope.ts";
import type { ConversionCandidate, ConversionPlan } from "#web/requests/convert/plan/conversion.ts";
import * as api from "#web/requests/index.ts";
import { useBusyAction } from "#web/utils/use-busy-action.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./convert-modal.module.css";

export interface ConvertModalProps {
  currentPath: string;
  onClose: () => void;
  onConverted: () => void;
}

const buildCandidateRows = (candidates: ConversionCandidate[]): ScrollListRow[] =>
  candidates.map((candidate) => ({
    key: candidate.relativePath,
    label: `${candidate.relativePath} -> ${candidate.destinationPath}`,
    className: candidate.willOverwrite ? styles.overwrite : styles.new,
  }));

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
  const candidateRows = useMemo(() => (plan ? buildCandidateRows(plan.candidates) : []), [plan]);

  const footer =
    plan && plan.candidates.length > 0 ? (
      <>
        <button type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={handleConvert}>
          {`Convert ${plan.candidates.length} file(s)`}
        </button>
      </>
    ) : (
      <button type="button" disabled={busy} onClick={onClose}>
        Close
      </button>
    );

  return (
    <Modal title={`Convert assets in ${directoryLabel}`} onClose={onClose} footer={footer}>
      <ScopeSelector scope={scope} onScopeChange={setScope} directoryLabel={directoryLabel} />
      {message && <MessageBanner message={message} />}
      {!plan && !message && <p>Checking for conversions...</p>}
      {hasNothingToConvert && <p>Nothing to convert.</p>}
      {plan && !hasNothingToConvert && (
        <div className={styles.section}>
          <p className={styles.summary}>{`${plan.candidates.length} file(s) to convert:`}</p>
          <ScrollList rows={candidateRows} />
        </div>
      )}
    </Modal>
  );
};
