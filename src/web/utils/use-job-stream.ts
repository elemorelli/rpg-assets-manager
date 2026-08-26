import { type Dispatch, type SetStateAction, useEffect, useReducer, useRef, useState } from "react";

import { parseJobEvent } from "#utils/job.ts";
import { type JobDisplayState, nextJobDisplayState } from "#web/utils/job-progress-state.ts";

const IDLE: JobDisplayState = { kind: "idle" };
const ETA_TICK_MS = 1000;

export type SetJobDisplayState = Dispatch<SetStateAction<JobDisplayState>>;

export const useJobStream = (
  onSucceeded?: (type: string) => void,
): [JobDisplayState, SetJobDisplayState] => {
  const [displayState, setDisplayState] = useState<JobDisplayState>(IDLE);
  const [, tick] = useReducer((count: number) => count + 1, 0);
  const onSucceededRef = useRef(onSucceeded);
  onSucceededRef.current = onSucceeded;

  useEffect(() => {
    const source = new EventSource("/api/jobs/stream");

    source.onmessage = (event) => {
      const incoming = parseJobEvent(event.data);

      setDisplayState((previous) => {
        const next = nextJobDisplayState(previous, incoming);

        if (next.kind === "succeeded" && previous.kind === "running") {
          onSucceededRef.current?.(previous.type);
        }

        return next;
      });
    };

    return () => {
      source.close();
    };
  }, []);

  useEffect(() => {
    if (displayState.kind !== "running" || displayState.indeterminate) {
      return;
    }

    const interval = setInterval(tick, ETA_TICK_MS);

    return () => clearInterval(interval);
  }, [displayState]);

  return [displayState, setDisplayState];
};
