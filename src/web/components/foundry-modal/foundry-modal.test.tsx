// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { FoundryModal } from "./foundry-modal.tsx";

vi.mock("#web/requests/index.ts");

const fetchFoundryWorldsMock = vi.mocked(api.fetchFoundryWorlds);
const markFoundryWorldAppliedMock = vi.mocked(api.markFoundryWorldApplied);
const fetchFoundryPlaylistTagsMock = vi.mocked(api.fetchFoundryPlaylistTags);

const COPY_FEEDBACK_DURATION_MS = 1500;

describe("FoundryModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchFoundryPlaylistTagsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  it("asks for confirmation before marking a world as applied", async () => {
    const user = userEvent.setup();
    const onMarkedApplied = vi.fn();
    fetchFoundryWorldsMock.mockResolvedValue([
      { id: 1, name: "kingmaker", pendingMacro: "await migrate();", pendingRenameCount: 1 },
    ]);
    markFoundryWorldAppliedMock.mockResolvedValue(undefined);

    render(<FoundryModal onClose={vi.fn()} onMarkedApplied={onMarkedApplied} />);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: "Mark as applied" }));

    expect(markFoundryWorldAppliedMock).not.toHaveBeenCalled();

    const confirmButtons = screen.getAllByRole("button", { name: "Mark as applied" });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(markFoundryWorldAppliedMock).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Up to date.")).toBeInTheDocument();
    expect(onMarkedApplied).toHaveBeenCalled();
  });

  it("does not mark a world as applied when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    fetchFoundryWorldsMock.mockResolvedValue([
      { id: 1, name: "kingmaker", pendingMacro: "await migrate();", pendingRenameCount: 1 },
    ]);

    render(<FoundryModal onClose={vi.fn()} />);
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: "Mark as applied" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(markFoundryWorldAppliedMock).not.toHaveBeenCalled();
    expect(screen.getByText("1 rename(s) pending.")).toBeInTheDocument();
  });

  it("copies the macro to the clipboard and shows temporary feedback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    fetchFoundryWorldsMock.mockResolvedValue([
      { id: 1, name: "kingmaker", pendingMacro: "await migrate();", pendingRenameCount: 1 },
    ]);

    render(<FoundryModal onClose={vi.fn()} />);
    await screen.findByRole("textbox");

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Copy macro" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(writeTextMock).toHaveBeenCalledWith("await migrate();");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_DURATION_MS);
    });

    expect(screen.getByRole("button", { name: "Copy macro" })).toBeInTheDocument();
    vi.useRealTimers();
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
