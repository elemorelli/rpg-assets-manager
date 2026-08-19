// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { FoundryModal } from "./foundry-modal.tsx";

vi.mock("#web/requests/index.ts");

const fetchFoundryWorldsMock = vi.mocked(api.fetchFoundryWorlds);
const markFoundryWorldAppliedMock = vi.mocked(api.markFoundryWorldApplied);

describe("FoundryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("checks for pending macros as soon as it opens", () => {
    fetchFoundryWorldsMock.mockResolvedValue([]);

    render(<FoundryModal onClose={vi.fn()} />);

    expect(fetchFoundryWorldsMock).toHaveBeenCalled();
  });

  it("shows a message when there are no worlds configured", async () => {
    fetchFoundryWorldsMock.mockResolvedValue([]);

    render(<FoundryModal onClose={vi.fn()} />);

    expect(await screen.findByText("No Foundry worlds configured.")).toBeInTheDocument();
  });

  it("shows a world as up to date when it has no pending macro", async () => {
    fetchFoundryWorldsMock.mockResolvedValue([
      { id: 1, name: "kingmaker", pendingMacro: null, pendingRenameCount: 0 },
    ]);

    render(<FoundryModal onClose={vi.fn()} />);

    expect(await screen.findByText("kingmaker")).toBeInTheDocument();
    expect(screen.getByText("Up to date.")).toBeInTheDocument();
  });

  it("shows the pending macro and rename count for a world", async () => {
    fetchFoundryWorldsMock.mockResolvedValue([
      { id: 1, name: "kingmaker", pendingMacro: "await migrate();", pendingRenameCount: 2 },
    ]);

    render(<FoundryModal onClose={vi.fn()} />);

    expect(await screen.findByText("2 rename(s) pending.")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("await migrate();");
  });

  it("marks a world as applied and clears its pending macro", async () => {
    const user = userEvent.setup();
    const onMarkedApplied = vi.fn();
    fetchFoundryWorldsMock.mockResolvedValue([
      { id: 1, name: "kingmaker", pendingMacro: "await migrate();", pendingRenameCount: 1 },
    ]);
    markFoundryWorldAppliedMock.mockResolvedValue(undefined);

    render(<FoundryModal onClose={vi.fn()} onMarkedApplied={onMarkedApplied} />);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: "Mark as applied" }));

    expect(markFoundryWorldAppliedMock).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Up to date.")).toBeInTheDocument();
    expect(onMarkedApplied).toHaveBeenCalled();
  });

  it("shows an error message when fetching worlds fails", async () => {
    fetchFoundryWorldsMock.mockRejectedValue(new Error("network down"));

    render(<FoundryModal onClose={vi.fn()} />);

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("closes when Close is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchFoundryWorldsMock.mockResolvedValue([]);

    render(<FoundryModal onClose={onClose} />);
    await screen.findByText("No Foundry worlds configured.");
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalled();
  });
});
