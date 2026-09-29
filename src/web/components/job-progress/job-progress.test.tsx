// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CurrentJob, JobState } from "#utils/job.ts";
import { FakeEventSource, stubEventSource } from "#web/test-utils/fake-event-source.ts";
import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { JobProgress } from "./job-progress.tsx";

const SUCCESS_AUTO_DISMISS_MS = 4000;
const TEN_SECONDS_MS = 10_000;

const runningJob = (overrides: Partial<JobState> = {}): JobState => ({
  type: "rescan",
  stage: "hashing",
  done: 3,
  total: 10,
  startedAt: Date.now(),
  error: null,
  ...overrides,
});

const emitJob = (job: CurrentJob): void => {
  const source = FakeEventSource.instances[0];

  act(() => source?.emitMessage(JSON.stringify(job)));
};

describe("JobProgress", () => {
  beforeEach(() => {
    stubEventSource();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing while there is no current job", () => {
    const { container } = render(<JobProgress />);
    emitJob(null);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a blocking dialog with progress for the current job", () => {
    render(<JobProgress />);
    emitJob(runningJob());

    expect(screen.getByRole("dialog", { name: "rescan: hashing" })).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("offers a cancel button while a rescan is running", () => {
    render(<JobProgress />);
    emitJob(runningJob());

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("offers a cancel button while a convert is running", () => {
    render(<JobProgress />);
    emitJob(runningJob({ type: "convert", stage: "converting" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("does not offer a cancel button for job types that can't be cancelled", () => {
    render(<JobProgress />);
    emitJob(runningJob({ type: "sync", stage: "applying" }));

    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("posts to the cancel endpoint when the cancel button is clicked", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ cancelled: true })));
    const user = userEvent.setup();

    render(<JobProgress />);
    emitJob(runningJob());
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/jobs/cancel", { method: "POST" });
  });

  it("re-enables the cancel button without throwing when the cancel request fails", async () => {
    stubFetch(new Response(null, { status: 500 }));
    const user = userEvent.setup();

    render(<JobProgress />);
    emitJob(runningJob());
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeEnabled();
  });

  it("shows a cancelled confirmation when the server reports the job as cancelled", () => {
    render(<JobProgress />);
    emitJob(runningJob({ cancelled: true }));

    expect(screen.getByRole("dialog", { name: "rescan: cancelled" })).toBeInTheDocument();
  });

  it("does not allow dismissing the dialog while the job is running", () => {
    render(<JobProgress />);
    emitJob(runningJob());

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("shows the current file/step detail when the server reports one", () => {
    render(<JobProgress />);
    emitJob(runningJob({ detail: "assets/goblin.png" }));

    expect(screen.getByText("assets/goblin.png")).toBeInTheDocument();
  });

  it("shows an ETA once some progress and time have passed", () => {
    vi.useFakeTimers();
    render(<JobProgress />);
    const startedAt = Date.now();

    emitJob(runningJob({ done: 2, startedAt }));
    act(() => vi.advanceTimersByTime(TEN_SECONDS_MS));

    expect(screen.getByText("ETA: 40s")).toBeInTheDocument();
  });

  it("renders an indeterminate spinner when the total is unknown", () => {
    render(<JobProgress />);
    emitJob(runningJob({ type: "sync", stage: "applying", done: 0, total: 0 }));

    expect(screen.getByTestId("progress-modal-spinner")).toBeInTheDocument();
  });

  it("renders nothing for a job type with its own dedicated modal", () => {
    const { container } = render(<JobProgress />);
    emitJob(runningJob({ type: "reconcile", stage: "checking" }));

    expect(container).toBeEmptyDOMElement();
  });

  it("still calls onJobSucceeded for a job type with its own dedicated modal", () => {
    const onJobSucceeded = vi.fn();

    render(<JobProgress onJobSucceeded={onJobSucceeded} />);
    emitJob(runningJob({ type: "reconcile", stage: "checking", done: 10 }));
    emitJob(null);

    expect(onJobSucceeded).toHaveBeenCalledWith("reconcile");
  });

  it("renders an error message and the failing file when the job fails", () => {
    render(<JobProgress />);
    emitJob(runningJob({ detail: "assets/goblin.png", error: "disk full" }));

    expect(screen.getByRole("dialog", { name: "rescan: failed" })).toBeInTheDocument();
    expect(screen.getByText("disk full")).toBeInTheDocument();
    expect(screen.getByText("File: assets/goblin.png")).toBeInTheDocument();
  });

  it("dismisses the error when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobProgress />);
    emitJob(runningJob({ error: "disk full" }));
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("disk full")).not.toBeInTheDocument();
  });

  it("shows a success confirmation when a running job clears without an error", () => {
    render(<JobProgress />);
    emitJob(runningJob({ done: 10 }));
    emitJob(null);

    expect(screen.getByRole("dialog", { name: "rescan: completed" })).toBeInTheDocument();
  });

  it("auto-dismisses the success confirmation after a few seconds", () => {
    vi.useFakeTimers();
    render(<JobProgress />);
    emitJob(runningJob({ done: 10 }));
    emitJob(null);

    expect(screen.getByRole("dialog", { name: "rescan: completed" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS));

    expect(screen.queryByRole("dialog", { name: "rescan: completed" })).not.toBeInTheDocument();
  });

  it("dismisses the success confirmation when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobProgress />);
    emitJob(runningJob({ done: 10 }));
    emitJob(null);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByRole("dialog", { name: "rescan: completed" })).not.toBeInTheDocument();
  });

  it("connects to /api/jobs/stream", () => {
    render(<JobProgress />);

    expect(FakeEventSource.instances[0]?.url).toBe("/api/jobs/stream");
  });

  it("calls onJobSucceeded with the job type once a running job clears without an error", () => {
    const onJobSucceeded = vi.fn();

    render(<JobProgress onJobSucceeded={onJobSucceeded} />);
    emitJob(runningJob({ type: "sync", stage: "applying", done: 10 }));

    expect(onJobSucceeded).not.toHaveBeenCalled();

    emitJob(null);

    expect(onJobSucceeded).toHaveBeenCalledTimes(1);
    expect(onJobSucceeded).toHaveBeenCalledWith("sync");
  });

  it("does not call onJobSucceeded when a job fails", () => {
    const onJobSucceeded = vi.fn();

    render(<JobProgress onJobSucceeded={onJobSucceeded} />);
    emitJob(runningJob({ type: "sync", stage: "applying", error: "disk full" }));

    expect(onJobSucceeded).not.toHaveBeenCalled();
  });
});
