// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeEventSource } from "#web/test-utils/fake-event-source.ts";

import { JobProgress } from "./job-progress.tsx";

const SUCCESS_AUTO_DISMISS_MS = 4000;
const TEN_SECONDS_MS = 10_000;

describe("JobProgress", () => {
  beforeEach(() => {
    FakeEventSource.reset();
    // @ts-expect-error test double
    globalThis.EventSource = FakeEventSource;
  });

  afterEach(() => {
    // @ts-expect-error test double
    delete globalThis.EventSource;
    vi.useRealTimers();
  });

  it("renders nothing while there is no current job", () => {
    const { container } = render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() => source?.emitMessage("null"));

    expect(container).toBeEmptyDOMElement();
  });

  it("renders a blocking dialog with progress for the current job", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 3,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );

    expect(screen.getByRole("dialog", { name: "rescan: hashing" })).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("does not allow dismissing the dialog while the job is running", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 3,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("shows the current file/step detail when the server reports one", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          detail: "assets/goblin.png",
          done: 3,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );

    expect(screen.getByText("assets/goblin.png")).toBeInTheDocument();
  });

  it("shows an ETA once some progress and time have passed", () => {
    vi.useFakeTimers();
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    const startedAt = Date.now();

    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 2,
          total: 10,
          startedAt,
          error: null,
        }),
      ),
    );
    act(() => vi.advanceTimersByTime(TEN_SECONDS_MS));

    expect(screen.getByText("ETA: 40s")).toBeInTheDocument();
  });

  it("renders an indeterminate spinner when the total is unknown", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "reconcile",
          stage: "checking",
          done: 0,
          total: 0,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );

    expect(screen.getByTestId("progress-modal-spinner")).toBeInTheDocument();
  });

  it("renders an error message and the failing file when the job fails", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          detail: "assets/goblin.png",
          done: 3,
          total: 10,
          startedAt: Date.now(),
          error: "disk full",
        }),
      ),
    );

    expect(screen.getByRole("dialog", { name: "rescan: failed" })).toBeInTheDocument();
    expect(screen.getByText("disk full")).toBeInTheDocument();
    expect(screen.getByText("File: assets/goblin.png")).toBeInTheDocument();
  });

  it("dismisses the error when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 3,
          total: 10,
          startedAt: Date.now(),
          error: "disk full",
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("disk full")).not.toBeInTheDocument();
  });

  it("shows a success confirmation when a running job clears without an error", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 10,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );
    act(() => source?.emitMessage("null"));

    expect(screen.getByRole("dialog", { name: "rescan: completed" })).toBeInTheDocument();
  });

  it("auto-dismisses the success confirmation after a few seconds", () => {
    vi.useFakeTimers();
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 10,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );
    act(() => source?.emitMessage("null"));

    expect(screen.getByRole("dialog", { name: "rescan: completed" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS));

    expect(screen.queryByRole("dialog", { name: "rescan: completed" })).not.toBeInTheDocument();
  });

  it("dismisses the success confirmation when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 10,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );
    act(() => source?.emitMessage("null"));
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
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "sync",
          stage: "applying",
          done: 10,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );

    expect(onJobSucceeded).not.toHaveBeenCalled();

    act(() => source?.emitMessage("null"));

    expect(onJobSucceeded).toHaveBeenCalledTimes(1);
    expect(onJobSucceeded).toHaveBeenCalledWith("sync");
  });

  it("does not call onJobSucceeded when a job fails", () => {
    const onJobSucceeded = vi.fn();

    render(<JobProgress onJobSucceeded={onJobSucceeded} />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "sync",
          stage: "applying",
          done: 3,
          total: 10,
          startedAt: Date.now(),
          error: "disk full",
        }),
      ),
    );

    expect(onJobSucceeded).not.toHaveBeenCalled();
  });
});
