import { beforeEach, describe, expect, it } from "vitest";

import { cancelJobHandler } from "../cancel.ts";
import { setCurrentJob, setCurrentJobController } from "../store.ts";

describe("cancelJobHandler", () => {
  beforeEach(() => {
    setCurrentJob(null);
    setCurrentJobController(null);
  });

  it("reports cancelled: false when no cancellable job is running", () => {
    expect(cancelJobHandler()).toEqual({ cancelled: false });
  });

  it("aborts the running job's controller and reports cancelled: true", () => {
    const controller = new AbortController();
    setCurrentJobController({ controller, cancellable: true });

    expect(cancelJobHandler()).toEqual({ cancelled: true });
    expect(controller.signal.aborted).toBe(true);
  });
});
