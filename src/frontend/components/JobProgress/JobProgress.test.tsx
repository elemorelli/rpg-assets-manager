// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FakeEventSource } from "#frontend/testUtils/FakeEventSource.ts";
import { JobProgress } from "./JobProgress.tsx";

describe("JobProgress", () => {
  beforeEach(() => {
    FakeEventSource.reset();
    // @ts-expect-error test double
    globalThis.EventSource = FakeEventSource;
  });

  afterEach(() => {
    // @ts-expect-error test double
    delete globalThis.EventSource;
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

  it("connects to /api/jobs/stream", () => {
    render(<JobProgress />);

    expect(FakeEventSource.instances[0]?.url).toBe("/api/jobs/stream");
  });
});
