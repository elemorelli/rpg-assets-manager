// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { SyncSection } from "./sync-section.tsx";

vi.mock("../../requests/index.ts");

const fetchSyncRunsMock = vi.mocked(api.fetchSyncRuns);
const reconcileMock = vi.mocked(api.reconcile);

describe("SyncSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSyncRunsMock.mockResolvedValue([]);
  });

  it("shows the History tab's content by default, with Reconcile inactive", async () => {
    render(<SyncSection />);

    expect(await screen.findByText("No sync runs yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reconcile with R2" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Reconcile" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches to the Reconcile tab's content when its tab is clicked", async () => {
    const user = userEvent.setup();
    render(<SyncSection />);
    await screen.findByText("No sync runs yet.");

    await user.click(screen.getByRole("tab", { name: "Reconcile" }));

    expect(screen.getByRole("button", { name: "Reconcile with R2" })).toBeInTheDocument();
  });

  it("refreshes sync history when historyRefreshTrigger changes", async () => {
    const { rerender } = render(<SyncSection historyRefreshTrigger={1} />);
    await screen.findByText("No sync runs yet.");
    expect(fetchSyncRunsMock).toHaveBeenCalledTimes(1);

    rerender(<SyncSection historyRefreshTrigger={2} />);

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

    render(<SyncSection />);
    await user.click(screen.getByRole("tab", { name: "Reconcile" }));
    await user.click(screen.getByRole("button", { name: "Reconcile with R2" }));
    await screen.findByText("3 file(s) match. No differences found.");

    await user.click(screen.getByRole("tab", { name: "History" }));
    await user.click(screen.getByRole("tab", { name: "Reconcile" }));

    expect(screen.getByText("3 file(s) match. No differences found.")).toBeInTheDocument();
    expect(reconcileMock).toHaveBeenCalledTimes(1);
  });
});
