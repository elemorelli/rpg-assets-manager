// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FakeEventSource } from "#web/test-utils/fake-event-source.ts";

import { JobProgress } from "./job-progress.tsx";

const SUCCESS_AUTO_DISMISS_MS = 4000;

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

  it("renders progress for the current job", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({ type: "rescan", stage: "hashing", done: 3, total: 10, error: null }),
      ),
    );

    expect(screen.getByText("rescan: hashing")).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("renders an error message when the job fails", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "rescan",
          stage: "hashing",
          done: 3,
          total: 10,
          error: "disk full",
        }),
      ),
    );

    expect(screen.getByText("rescan failed: disk full")).toBeInTheDocument();
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
          error: "disk full",
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("rescan failed: disk full")).not.toBeInTheDocument();
  });

  it("shows a success confirmation when a running job clears without an error", () => {
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({ type: "rescan", stage: "hashing", done: 10, total: 10, error: null }),
      ),
    );
    act(() => source?.emitMessage("null"));

    expect(screen.getByText("rescan: completed")).toBeInTheDocument();
  });

  it("auto-dismisses the success confirmation after a few seconds", () => {
    vi.useFakeTimers();
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({ type: "rescan", stage: "hashing", done: 10, total: 10, error: null }),
      ),
    );
    act(() => source?.emitMessage("null"));

    expect(screen.getByText("rescan: completed")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(SUCCESS_AUTO_DISMISS_MS));

    expect(screen.queryByText("rescan: completed")).not.toBeInTheDocument();
  });

  it("dismisses the success confirmation when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<JobProgress />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({ type: "rescan", stage: "hashing", done: 10, total: 10, error: null }),
      ),
    );
    act(() => source?.emitMessage("null"));
    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.queryByText("rescan: completed")).not.toBeInTheDocument();
  });

  it("calls onJobStarted once when a job starts running", () => {
    const onJobStarted = vi.fn();
    render(<JobProgress onJobStarted={onJobStarted} />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({ type: "rescan", stage: "hashing", done: 3, total: 10, error: null }),
      ),
    );
    act(() =>
      source?.emitMessage(
        JSON.stringify({ type: "rescan", stage: "hashing", done: 7, total: 10, error: null }),
      ),
    );

    expect(onJobStarted).toHaveBeenCalledTimes(1);
  });

  it("connects to /api/jobs/stream", () => {
    render(<JobProgress />);

    expect(FakeEventSource.instances[0]?.url).toBe("/api/jobs/stream");
  });
});
