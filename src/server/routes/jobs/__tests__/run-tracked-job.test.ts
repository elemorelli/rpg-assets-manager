import { beforeEach, describe, expect, it } from "vitest";

import { runTrackedJob } from "../run-tracked-job.ts";
import {
  cancelCurrentJob,
  getCurrentJob,
  setCurrentJob,
  setCurrentJobController,
} from "../store.ts";

describe("runTrackedJob", () => {
  beforeEach(() => {
    setCurrentJob(null);
    setCurrentJobController(null);
  });

  it("clears the current job once the operation succeeds", async () => {
    const result = await runTrackedJob("rescan", "hashing", "rescan failed", async () => "done");

    expect(result).toBe("done");
    expect(getCurrentJob()).toBeNull();
  });

  it("records the failure and rethrows when the operation throws", async () => {
    await expect(
      runTrackedJob("rescan", "hashing", "rescan failed", async () => {
        throw new Error("disk full");
      }),
    ).rejects.toThrow("disk full");

    expect(getCurrentJob()).toMatchObject({ type: "rescan", error: "disk full" });
  });

  it("leaves cancelCurrentJob a no-op when the job wasn't registered as cancellable", async () => {
    let signalDuringRun: AbortSignal | undefined;

    const result = await runTrackedJob(
      "convert",
      "converting",
      "conversion failed",
      async (_p, signal) => {
        signalDuringRun = signal;
        cancelCurrentJob();

        return "converted";
      },
    );

    expect(result).toBe("converted");
    expect(signalDuringRun?.aborted).toBe(false);
    expect(getCurrentJob()).toBeNull();
  });

  it("marks the job cancelled when cancelCurrentJob is called on a cancellable job", async () => {
    let signalDuringRun: AbortSignal | undefined;

    const result = await runTrackedJob(
      "rescan",
      "hashing",
      "rescan failed",
      async (_p, signal) => {
        signalDuringRun = signal;
        cancelCurrentJob();

        return "stopped early";
      },
      { cancellable: true },
    );

    expect(result).toBe("stopped early");
    expect(signalDuringRun?.aborted).toBe(true);
    expect(getCurrentJob()).toMatchObject({ type: "rescan", cancelled: true });
  });
});
