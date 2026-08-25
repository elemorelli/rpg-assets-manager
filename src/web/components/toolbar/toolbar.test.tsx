// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Toolbar } from "./toolbar.tsx";

describe("Toolbar", () => {
  it("shows a confirmation before triggering a rescan", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={onRescan}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rescan" }));

    expect(onRescan).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Rescan now" }));

    expect(onRescan).toHaveBeenCalledWith(false);
  });

  it("does not trigger a rescan when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={onRescan}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rescan" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRescan).not.toHaveBeenCalled();
  });

  it("shows a warning before triggering a full rehash", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={onRescan}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Directory actions" }));
    await user.click(screen.getByRole("button", { name: "Full rehash" }));

    expect(onRescan).not.toHaveBeenCalled();
    expect(screen.getByText("Full rehash")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rehash" }));

    expect(onRescan).toHaveBeenCalledWith(true);
  });

  it("does not trigger a full rehash when the warning is cancelled", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={onRescan}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Directory actions" }));
    await user.click(screen.getByRole("button", { name: "Full rehash" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onRescan).not.toHaveBeenCalled();
  });

  it("disables its buttons while busy", () => {
    render(
      <Toolbar
        busy={true}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Rescan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sync" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Foundry" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Directory actions" })).toBeDisabled();
  });

  it("triggers onSync when Sync is clicked", async () => {
    const user = userEvent.setup();
    const onSync = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={onSync}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Sync" }));

    expect(onSync).toHaveBeenCalled();
  });

  it("triggers onReconcile when Reconcile is clicked", async () => {
    const user = userEvent.setup();
    const onReconcile = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={onReconcile}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Directory actions" }));
    await user.click(screen.getByRole("button", { name: "Reconcile" }));

    expect(onReconcile).toHaveBeenCalled();
  });

  it("triggers onConvert when Convert is clicked", async () => {
    const user = userEvent.setup();
    const onConvert = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={onConvert}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Convert" }));

    expect(onConvert).toHaveBeenCalled();
  });

  it("triggers onFoundry when Foundry is clicked", async () => {
    const user = userEvent.setup();
    const onFoundry = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={onFoundry}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Foundry" }));

    expect(onFoundry).toHaveBeenCalled();
  });

  it("shows a pending badge on the Foundry button when a macro is pending", () => {
    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={true}
        hasPendingSyncChanges={false}
      />,
    );

    expect(screen.getByTestId("foundry-pending-badge")).toBeInTheDocument();
  });

  it("shows a pending badge on the Sync button when changes are pending", () => {
    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={true}
      />,
    );

    expect(screen.getByTestId("sync-pending-badge")).toBeInTheDocument();
  });

  it("hides the pending badge on the Foundry button when nothing is pending", () => {
    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );

    expect(screen.queryByTestId("foundry-pending-badge")).not.toBeInTheDocument();
  });

  it("hides the pending badge on the Sync button when nothing is pending", () => {
    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );

    expect(screen.queryByTestId("sync-pending-badge")).not.toBeInTheDocument();
  });

  it("opens the directory actions menu when Directory actions is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
        hasPendingSyncChanges={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "New directory" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Directory actions" }));

    expect(screen.getByRole("button", { name: "New directory" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Full rehash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconcile" })).toBeInTheDocument();
  });
});
