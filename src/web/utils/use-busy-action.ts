import { useState } from "react";

import { describeError } from "#web/utils/describe-error.ts";

export interface UseBusyActionResult {
  busy: boolean;
  runBusyAction: (action: () => Promise<void>) => void;
}

export const useBusyAction = (setError: (error: string | null) => void): UseBusyActionResult => {
  const [busy, setBusy] = useState<boolean>(false);

  const runBusyAction = (action: () => Promise<void>): void => {
    setBusy(true);
    setError(null);

    action()
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  return { busy, runBusyAction };
};
