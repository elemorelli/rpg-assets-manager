import { type JSX, useState } from "react";

import { Button } from "#components/button/button.tsx";
import * as api from "#web/requests/index.ts";

export const CancelJobButton = (): JSX.Element => {
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const handleCancel = (): void => {
    setIsCancelling(true);

    api
      .cancelJob()
      .catch(() => {
        // The job stream reports the real outcome, so a failed cancel request needs no extra UI.
      })
      .finally(() => setIsCancelling(false));
  };

  return (
    <Button variant="secondary" onClick={handleCancel} disabled={isCancelling}>
      {isCancelling ? "Cancelling…" : "Cancel"}
    </Button>
  );
};
