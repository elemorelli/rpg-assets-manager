// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "#web/requests/index.ts";
import { ReconciliationPanel } from "./reconciliation-panel.tsx";

vi.mock("../../requests/index.ts");

const reconcileMock = vi.mocked(api.reconcile);

describe("ReconciliationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not reconcile until the user asks for it", () => {
    render(<ReconciliationPanel />);

    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("shows a message when everything matches", async () => {
    const user = userEvent.setup();
    reconcileMock.mockResolvedValue({
      matchCount: 3,
      missingOnSource: [],
      missingOnDestination: [],
      differs: [],
      errors: [],
    });

    render(<ReconciliationPanel />);
    await user.click(screen.getByRole("button", { name: "Reconcile with R2" }));

    expect(await screen.findByText("3 file(s) match. No differences found.")).toBeInTheDocument();
  });

  it("lists paths grouped by the kind of difference found", async () => {
    const user = userEvent.setup();
    reconcileMock.mockResolvedValue({
      matchCount: 1,
      missingOnSource: ["tiles/orphaned.png"],
      missingOnDestination: ["tiles/unsynced.png"],
      differs: ["tiles/stale.png"],
      errors: ["tiles/unreadable.png"],
    });

    render(<ReconciliationPanel />);
    await user.click(screen.getByRole("button", { name: "Reconcile with R2" }));

    expect(await screen.findByText("Missing on destination:")).toBeInTheDocument();
    expect(screen.getByText("tiles/unsynced.png")).toBeInTheDocument();
    expect(screen.getByText("Missing on source:")).toBeInTheDocument();
    expect(screen.getByText("tiles/orphaned.png")).toBeInTheDocument();
    expect(screen.getByText("Content differs:")).toBeInTheDocument();
    expect(screen.getByText("tiles/stale.png")).toBeInTheDocument();
    expect(screen.getByText("Errored while checking:")).toBeInTheDocument();
    expect(screen.getByText("tiles/unreadable.png")).toBeInTheDocument();
  });

  it("shows an error message when reconciliation fails", async () => {
    const user = userEvent.setup();
    reconcileMock.mockRejectedValue(new Error("rclone check failed"));

    render(<ReconciliationPanel />);
    await user.click(screen.getByRole("button", { name: "Reconcile with R2" }));

    expect(await screen.findByText("rclone check failed")).toBeInTheDocument();
  });
});
