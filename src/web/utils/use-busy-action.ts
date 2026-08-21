import { useState } from "react";

import { describeErrorAsMessage, type Message } from "#web/utils/message.ts";

export interface UseBusyActionResult {
  busy: boolean;
  runBusyAction: (action: () => Promise<void>) => void;
}

export const useBusyAction = (
  setMessage: (message: Message | null) => void,
): UseBusyActionResult => {
  const [busy, setBusy] = useState<boolean>(false);

  const runBusyAction = (action: () => Promise<void>): void => {
    setBusy(true);
    setMessage(null);

    action()
      .catch((caught: unknown) => setMessage(describeErrorAsMessage(caught)))
      .finally(() => setBusy(false));
  };

  return { busy, runBusyAction };
};
