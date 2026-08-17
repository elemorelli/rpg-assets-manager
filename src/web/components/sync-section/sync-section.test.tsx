// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BatchDiff } from "#web/requests/diff/fetch.ts";
import * as api from "#web/requests/index.ts";

import { SyncSection } from "./sync-section.tsx";

vi.mock("../../requests/index.ts");

const fetchDiffMock = vi.mocked(api.fetchDiff);
const applyBatchMock = vi.mocked(api.applyBatch);
const fetchSyncRunsMock = vi.mocked(api.fetchSyncRuns);
const reconcileMock = vi.mocked(api.reconcile);

const EMPTY_DIFF: BatchDiff = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

describe("SyncSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSyncRunsMock.mockResolvedValue([]);
  });

  it("shows the Sync tab's content by default, with History and Reconcile inactive", async () => {
    render(<SyncSection onApplied={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "Check for changes" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reconcile with R2" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sync" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "false");
  });

  it("switches to the History tab's content when its tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SyncSection onApplied={vi.fn()} />);
    await screen.findByRole("button", { name: "Check for changes" });

    await user.click(screen.getByRole("tab", { name: "History" }));

    expect(await screen.findByText("No sync runs yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check for changes" })).not.toBeInTheDocument();
  });

  it("switches to the Reconcile tab's content when its tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SyncSection onApplied={vi.fn()} />);
    await screen.findByRole("button", { name: "Check for changes" });

    await user.click(screen.getByRole("tab", { name: "Reconcile" }));

    expect(screen.getByRole("button", { name: "Reconcile with R2" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check for changes" })).not.toBeInTheDocument();
  });

  it("calls onApplied and refreshes sync history when changes are applied from the Sync tab", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    fetchDiffMock.mockResolvedValue({ ...EMPTY_DIFF, added: ["icons/goblin.png"] });
    applyBatchMock.mockResolvedValue({
      added: 1,
      modified: 0,
      deleted: 0,
      renamed: 0,
      outcome: "applied",
      syncRunId: 1,
    });

    render(<SyncSection onApplied={onApplied} />);
    await screen.findByRole("button", { name: "Check for changes" });
    expect(fetchSyncRunsMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Check for changes" }));
    await user.click(await screen.findByRole("button", { name: "Apply changes" }));

    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(fetchSyncRunsMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the reconciliation result after switching tabs and back", async () => {
    const user = userEvent.setup();
    reconcileMock.mockResolvedValue({
      matchCount: 3,
      missingOnDestination: [],
      missingOnSource: [],
      differs: [],
      errors: [],
    });

    render(<SyncSection onApplied={vi.fn()} />);
    await user.click(screen.getByRole("tab", { name: "Reconcile" }));
    await user.click(screen.getByRole("button", { name: "Reconcile with R2" }));
    await screen.findByText("3 file(s) match. No differences found.");

    await user.click(screen.getByRole("tab", { name: "Sync" }));
    await user.click(screen.getByRole("tab", { name: "Reconcile" }));

    expect(screen.getByText("3 file(s) match. No differences found.")).toBeInTheDocument();
    expect(reconcileMock).toHaveBeenCalledTimes(1);
  });
});
