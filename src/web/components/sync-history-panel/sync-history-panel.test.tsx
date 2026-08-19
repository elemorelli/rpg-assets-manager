// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { SyncHistoryPanel } from "./sync-history-panel.tsx";

vi.mock("../../requests/index.ts");

const fetchSyncRunsMock = vi.mocked(api.fetchSyncRuns);

describe("SyncHistoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a message when there are no runs", async () => {
    fetchSyncRunsMock.mockResolvedValue([]);

    render(<SyncHistoryPanel refreshToken={0} />);

    expect(await screen.findByText("No sync runs yet.")).toBeInTheDocument();
  });

  it("lists a run's counts and outcome", async () => {
    fetchSyncRunsMock.mockResolvedValue([
      {
        id: 1,
        startedAt: "2026-08-14T00:00:00.000Z",
        finishedAt: "2026-08-14T00:01:00.000Z",
        addedCount: 2,
        modifiedCount: 0,
        deletedCount: 1,
        renamedCount: 0,
        outcome: "applied",
      },
    ]);

    render(<SyncHistoryPanel refreshToken={0} />);

    expect(
      await screen.findByText(/applied: 2 added, 0 modified, 1 deleted, 0 renamed/),
    ).toBeInTheDocument();
  });

  it("shows an error message when fetching fails", async () => {
    fetchSyncRunsMock.mockRejectedValue(new Error("network down"));

    render(<SyncHistoryPanel refreshToken={0} />);

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("refetches when refreshToken changes", async () => {
    fetchSyncRunsMock.mockResolvedValue([]);

    const { rerender } = render(<SyncHistoryPanel refreshToken={0} />);
    await waitFor(() => expect(fetchSyncRunsMock).toHaveBeenCalledTimes(1));

    rerender(<SyncHistoryPanel refreshToken={1} />);

    await waitFor(() => expect(fetchSyncRunsMock).toHaveBeenCalledTimes(2));
  });
});
