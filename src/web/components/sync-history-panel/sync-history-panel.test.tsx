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

  it("expands the most recent run with a macro by default and collapses older ones", async () => {
    const NEWER_RUN_ID = 2;
    const OLDER_RUN_ID = 1;
    fetchSyncRunsMock.mockResolvedValue([
      {
        id: NEWER_RUN_ID,
        startedAt: "2026-08-15T00:00:00.000Z",
        finishedAt: "2026-08-15T00:01:00.000Z",
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        renamedCount: 1,
        outcome: "applied",
        generatedMacro: "await migrateNewer();",
        worldAcknowledgements: {},
      },
      {
        id: OLDER_RUN_ID,
        startedAt: "2026-08-14T00:00:00.000Z",
        finishedAt: "2026-08-14T00:01:00.000Z",
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        renamedCount: 1,
        outcome: "applied",
        generatedMacro: "await migrateOlder();",
        worldAcknowledgements: {},
      },
    ]);

    render(<SyncHistoryPanel refreshToken={0} />);

    expect(await screen.findByDisplayValue("await migrateNewer();")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("await migrateOlder();")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide macro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show macro" })).toBeInTheDocument();
  });

  it("expands a collapsed run's macro when its toggle is clicked", async () => {
    const user = userEvent.setup();
    fetchSyncRunsMock.mockResolvedValue([
      {
        id: 2,
        startedAt: "2026-08-15T00:00:00.000Z",
        finishedAt: "2026-08-15T00:01:00.000Z",
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        renamedCount: 1,
        outcome: "applied",
        generatedMacro: "await migrateNewer();",
        worldAcknowledgements: {},
      },
      {
        id: 1,
        startedAt: "2026-08-14T00:00:00.000Z",
        finishedAt: "2026-08-14T00:01:00.000Z",
        addedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        renamedCount: 1,
        outcome: "applied",
        generatedMacro: "await migrateOlder();",
        worldAcknowledgements: {},
      },
    ]);

    render(<SyncHistoryPanel refreshToken={0} />);
    await screen.findByDisplayValue("await migrateNewer();");
    await user.click(screen.getByRole("button", { name: "Show macro" }));

    expect(screen.getByDisplayValue("await migrateOlder();")).toBeInTheDocument();
  });

  it("collapses an expanded run's macro when its toggle is clicked again", async () => {
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
        worldAcknowledgements: {},
      },
    ]);

    render(<SyncHistoryPanel refreshToken={0} />);
    await screen.findByDisplayValue("await migrate();");
    await user.click(screen.getByRole("button", { name: "Hide macro" }));

    expect(screen.queryByDisplayValue("await migrate();")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show macro" })).toBeInTheDocument();
  });

  it("refetches when refreshToken changes", async () => {
    fetchSyncRunsMock.mockResolvedValue([]);

    const { rerender } = render(<SyncHistoryPanel refreshToken={0} />);
    await waitFor(() => expect(fetchSyncRunsMock).toHaveBeenCalledTimes(1));

    rerender(<SyncHistoryPanel refreshToken={1} />);

    await waitFor(() => expect(fetchSyncRunsMock).toHaveBeenCalledTimes(2));
  });
});
