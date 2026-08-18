// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { ReconciliationModal } from "./reconciliation-modal.tsx";

vi.mock("#web/requests/index.ts");

const reconcileMock = vi.mocked(api.reconcile);

describe("ReconciliationModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(screen.getByText("> tiles/unsynced.png")).toBeInTheDocument();
    expect(screen.getByText("< tiles/orphaned.png")).toBeInTheDocument();
    expect(screen.getByText("~ tiles/stale.png")).toBeInTheDocument();
    expect(screen.getByText("! tiles/unreadable.png")).toBeInTheDocument();
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
});
