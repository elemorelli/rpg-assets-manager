// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "#web/requests/index.ts";
import { SyncHistoryPanel } from "./sync-history-panel.tsx";

vi.mock("../../requests/index.ts");

const fetchSyncRunsMock = vi.mocked(api.fetchSyncRuns);
const acknowledgeWorldMock = vi.mocked(api.acknowledgeWorld);

const SYNC_RUN_ID = 7;

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

  it("lists a run's counts and outcome without a macro section when there are no renames", async () => {
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
        generatedMacro: null,
        worldAcknowledgements: {},
      },
    ]);

    render(<SyncHistoryPanel refreshToken={0} />);

    expect(
      await screen.findByText(/applied: 2 added, 0 modified, 1 deleted, 0 renamed/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Foundry migration macro:")).not.toBeInTheDocument();
  });

  it("shows the macro and a checkbox per configured world when renames produced a macro", async () => {
    fetchSyncRunsMock.mockResolvedValue([
      {
        id: SYNC_RUN_ID,
        startedAt: "2026-08-14T00:00:00.000Z",
        finishedAt: "2026-08-14T00:01:00.000Z",
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        renamedCount: 1,
        outcome: "applied",
        generatedMacro: "await migrate();",
        worldAcknowledgements: { kingmaker: false, "stolen-fate": false },
      },
    ]);

    render(<SyncHistoryPanel refreshToken={0} />);

    expect(await screen.findByText("Foundry migration macro:")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("await migrate();");
    expect(screen.getByRole("checkbox", { name: "kingmaker" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "stolen-fate" })).not.toBeChecked();
  });

  it("acknowledges a world when its checkbox is checked", async () => {
    const user = userEvent.setup();
    fetchSyncRunsMock.mockResolvedValue([
      {
        id: SYNC_RUN_ID,
        startedAt: "2026-08-14T00:00:00.000Z",
        finishedAt: "2026-08-14T00:01:00.000Z",
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        renamedCount: 1,
        outcome: "applied",
        generatedMacro: "await migrate();",
        worldAcknowledgements: { kingmaker: false },
      },
    ]);
    acknowledgeWorldMock.mockResolvedValue(undefined);

    render(<SyncHistoryPanel refreshToken={0} />);
    const checkbox = await screen.findByRole("checkbox", { name: "kingmaker" });
    await user.click(checkbox);

    await waitFor(() => {
      expect(acknowledgeWorldMock).toHaveBeenCalledWith(SYNC_RUN_ID, "kingmaker", true);
    });
    expect(checkbox).toBeChecked();
  });

  it("refetches when refreshToken changes", async () => {
    fetchSyncRunsMock.mockResolvedValue([]);

    const { rerender } = render(<SyncHistoryPanel refreshToken={0} />);
    await waitFor(() => expect(fetchSyncRunsMock).toHaveBeenCalledTimes(1));

    rerender(<SyncHistoryPanel refreshToken={1} />);

    await waitFor(() => expect(fetchSyncRunsMock).toHaveBeenCalledTimes(2));
  });
});
