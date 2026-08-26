// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";
import { FakeEventSource } from "#web/test-utils/fake-event-source.ts";

import { ReconciliationModal } from "./reconciliation-modal.tsx";

vi.mock("#web/requests/index.ts");

const reconcileMock = vi.mocked(api.reconcile);
const cancelJobMock = vi.mocked(api.cancelJob);

describe("ReconciliationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeEventSource.reset();
    // @ts-expect-error test double
    globalThis.EventSource = FakeEventSource;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test double
    delete globalThis.EventSource;
  });

  it("checks for differences as soon as it opens", () => {
    reconcileMock.mockResolvedValue({
      matchCount: 0,
      missingOnSource: [],
      missingOnDestination: [],
      differs: [],
      errors: [],
    });

    render(<ReconciliationModal onClose={vi.fn()} />);

    expect(reconcileMock).toHaveBeenCalled();
  });

  it("shows a message when everything matches", async () => {
    reconcileMock.mockResolvedValue({
      matchCount: 3,
      missingOnSource: [],
      missingOnDestination: [],
      differs: [],
      errors: [],
    });

    render(<ReconciliationModal onClose={vi.fn()} />);

    expect(await screen.findByText("3 file(s) match. No differences found.")).toBeInTheDocument();
  });

  it("shows colored counts and the change list grouped by kind of difference", async () => {
    reconcileMock.mockResolvedValue({
      matchCount: 1,
      missingOnSource: ["tiles/orphaned.png"],
      missingOnDestination: ["tiles/unsynced.png"],
      differs: ["tiles/stale.png"],
      errors: ["tiles/unreadable.png"],
    });

    render(<ReconciliationModal onClose={vi.fn()} />);

    expect(await screen.findByText("1 missing on destination")).toBeInTheDocument();
    expect(screen.getByText("1 missing on source")).toBeInTheDocument();
    expect(screen.getByText("1 differ")).toBeInTheDocument();
    expect(screen.getByText("1 errored")).toBeInTheDocument();
    expect(screen.getByText("tiles/unsynced.png")).toBeInTheDocument();
    expect(screen.getByText("tiles/orphaned.png")).toBeInTheDocument();
    expect(screen.getAllByText("tiles/stale.png")).toHaveLength(2);
    expect(screen.getByText("Errors:")).toBeInTheDocument();
    expect(screen.getByText("tiles/unreadable.png")).toBeInTheDocument();
  });

  it("shows an error message when reconciliation fails", async () => {
    reconcileMock.mockRejectedValue(new Error("rclone check failed"));

    render(<ReconciliationModal onClose={vi.fn()} />);

    expect(await screen.findByText("rclone check failed")).toBeInTheDocument();
  });

  it("closes when Close is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    reconcileMock.mockResolvedValue({
      matchCount: 0,
      missingOnSource: [],
      missingOnDestination: [],
      differs: [],
      errors: [],
    });

    render(<ReconciliationModal onClose={onClose} />);
    await screen.findByText("0 file(s) match. No differences found.");
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalled();
  });

  it("shows live progress from the job stream instead of the static checking message", () => {
    reconcileMock.mockReturnValue(new Promise(() => {}));

    render(<ReconciliationModal onClose={vi.fn()} />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "reconcile",
          stage: "checking",
          done: 16442,
          total: 16450,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );

    expect(screen.getByText("16442 / 16450")).toBeInTheDocument();
    expect(screen.queryByText("Checking for differences...")).not.toBeInTheDocument();
  });

  it("offers a cancel button instead of close while the job is running", () => {
    reconcileMock.mockReturnValue(new Promise(() => {}));

    render(<ReconciliationModal onClose={vi.fn()} />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "reconcile",
          stage: "checking",
          done: 1,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("posts to the cancel endpoint when the cancel button is clicked", async () => {
    cancelJobMock.mockResolvedValue({ cancelled: true });
    reconcileMock.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    render(<ReconciliationModal onClose={vi.fn()} />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "reconcile",
          stage: "checking",
          done: 1,
          total: 10,
          startedAt: Date.now(),
          error: null,
        }),
      ),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(cancelJobMock).toHaveBeenCalled();
  });

  it("shows a cancelled message instead of the fetch result once the job is cancelled", async () => {
    reconcileMock.mockResolvedValue({
      matchCount: 0,
      missingOnSource: [],
      missingOnDestination: [],
      differs: [],
      errors: [],
    });

    render(<ReconciliationModal onClose={vi.fn()} />);
    const source = FakeEventSource.instances[0];
    act(() =>
      source?.emitMessage(
        JSON.stringify({
          type: "reconcile",
          stage: "checking",
          done: 1,
          total: 10,
          startedAt: Date.now(),
          error: null,
          cancelled: true,
        }),
      ),
    );

    expect(await screen.findByText("Reconcile cancelled.")).toBeInTheDocument();
    expect(screen.queryByText("0 file(s) match. No differences found.")).not.toBeInTheDocument();
  });
});
