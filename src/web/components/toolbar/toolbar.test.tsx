// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Toolbar } from "./toolbar.tsx";

const baseProps = {
  busy: false,
  onCreateDirectory: vi.fn(),
  onUploadFile: vi.fn(),
  onRescan: vi.fn(),
  onConvert: vi.fn(),
  onSync: vi.fn(),
  onReconcile: vi.fn(),
  onFoundry: vi.fn(),
  hasPendingFoundryMacro: false,
  hasPendingSyncChanges: false,
};

describe("Toolbar", () => {
  it("shows a confirmation before triggering a rescan", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(<Toolbar {...baseProps} onRescan={onRescan} />);
    await user.click(screen.getByRole("button", { name: "Rescan" }));

    expect(onRescan).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Rescan now" }));

    expect(onRescan).toHaveBeenCalledWith({ removeEmptyFolders: false });
  });

  it("asks the rescan to remove empty folders when the checkbox is ticked", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(<Toolbar {...baseProps} onRescan={onRescan} />);
    await user.click(screen.getByRole("button", { name: "Rescan" }));
    await user.click(screen.getByRole("checkbox", { name: "Also remove empty folders" }));
    await user.click(screen.getByRole("button", { name: "Rescan now" }));

    expect(onRescan).toHaveBeenCalledWith({ removeEmptyFolders: true });
  });

  it("does not trigger a rescan when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(<Toolbar {...baseProps} onRescan={onRescan} />);
    await user.click(screen.getByRole("button", { name: "Rescan" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRescan).not.toHaveBeenCalled();
  });

  it("shows a warning before triggering a full rehash", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(<Toolbar {...baseProps} onRescan={onRescan} />);
    await user.click(screen.getByRole("button", { name: "Directory actions" }));
    await user.click(screen.getByRole("button", { name: "Full rehash" }));

    expect(onRescan).not.toHaveBeenCalled();
    expect(screen.getByText("Full rehash")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rehash" }));

    expect(onRescan).toHaveBeenCalledWith({ forceRehash: true });
  });

  it("does not trigger a full rehash when the warning is cancelled", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(<Toolbar {...baseProps} onRescan={onRescan} />);
    await user.click(screen.getByRole("button", { name: "Directory actions" }));
    await user.click(screen.getByRole("button", { name: "Full rehash" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRescan).not.toHaveBeenCalled();
  });

  it("disables its buttons while busy", () => {
    render(<Toolbar {...baseProps} busy={true} />);

    expect(screen.getByRole("button", { name: "Rescan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sync" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Foundry" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Directory actions" })).toBeDisabled();
  });

  it("triggers onSync when Sync is clicked", async () => {
    const user = userEvent.setup();
    const onSync = vi.fn();

    render(<Toolbar {...baseProps} onSync={onSync} />);
    await user.click(screen.getByRole("button", { name: "Sync" }));

    expect(onSync).toHaveBeenCalled();
  });

  it("triggers onReconcile when Reconcile is clicked", async () => {
    const user = userEvent.setup();
    const onReconcile = vi.fn();

    render(<Toolbar {...baseProps} onReconcile={onReconcile} />);
    await user.click(screen.getByRole("button", { name: "Directory actions" }));
    await user.click(screen.getByRole("button", { name: "Reconcile" }));

    expect(onReconcile).toHaveBeenCalled();
  });

  it("triggers onConvert when Convert is clicked", async () => {
    const user = userEvent.setup();
    const onConvert = vi.fn();

    render(<Toolbar {...baseProps} onConvert={onConvert} />);
    await user.click(screen.getByRole("button", { name: "Convert" }));

    expect(onConvert).toHaveBeenCalled();
  });

  it("triggers onFoundry when Foundry is clicked", async () => {
    const user = userEvent.setup();
    const onFoundry = vi.fn();

    render(<Toolbar {...baseProps} onFoundry={onFoundry} />);
    await user.click(screen.getByRole("button", { name: "Foundry" }));

    expect(onFoundry).toHaveBeenCalled();
  });

  it("shows a pending badge on the Foundry button when a macro is pending", () => {
    render(<Toolbar {...baseProps} hasPendingFoundryMacro={true} />);

    expect(screen.getByTestId("foundry-pending-badge")).toBeInTheDocument();
  });

  it("shows a pending badge on the Sync button when changes are pending", () => {
    render(<Toolbar {...baseProps} hasPendingSyncChanges={true} />);

    expect(screen.getByTestId("sync-pending-badge")).toBeInTheDocument();
  });

  it("hides the pending badge on the Foundry button when nothing is pending", () => {
    render(<Toolbar {...baseProps} />);

    expect(screen.queryByTestId("foundry-pending-badge")).not.toBeInTheDocument();
  });

  it("hides the pending badge on the Sync button when nothing is pending", () => {
    render(<Toolbar {...baseProps} />);

    expect(screen.queryByTestId("sync-pending-badge")).not.toBeInTheDocument();
  });

  it("opens the directory actions menu when Directory actions is clicked", async () => {
    const user = userEvent.setup();

    render(<Toolbar {...baseProps} />);

    expect(screen.queryByRole("button", { name: "New directory" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Directory actions" }));

    expect(screen.getByRole("button", { name: "New directory" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full rehash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconcile" })).toBeInTheDocument();
  });
});
