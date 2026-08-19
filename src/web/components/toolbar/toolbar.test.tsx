// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toolbar } from "./toolbar.tsx";

describe("Toolbar", () => {
  let promptSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    promptSpy = vi.spyOn(window, "prompt");
  });

  afterEach(() => {
    promptSpy.mockRestore();
  });

  it("asks for a folder name and forwards it on confirmation", async () => {
    const user = userEvent.setup();
    const onCreateDirectory = vi.fn();
    promptSpy.mockReturnValue("legacy-pack");

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={onCreateDirectory}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "New folder" }));

    expect(onCreateDirectory).toHaveBeenCalledWith("legacy-pack");
  });

  it("does not create a folder when the prompt is dismissed", async () => {
    const user = userEvent.setup();
    const onCreateDirectory = vi.fn();
    promptSpy.mockReturnValue(null);

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={onCreateDirectory}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "New folder" }));

    expect(onCreateDirectory).not.toHaveBeenCalled();
  });

  it("forwards a selected file to onUploadFile", async () => {
    const user = userEvent.setup();
    const onUploadFile = vi.fn();
    const file = new File(["content"], "map.png", { type: "image/png" });

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={onUploadFile}
        onRescan={vi.fn()}
        onConvert={vi.fn()}
        onSync={vi.fn()}
        onReconcile={vi.fn()}
        onFoundry={vi.fn()}
        hasPendingFoundryMacro={false}
      />,
    );
    const hiddenInput = document.querySelector('input[type="file"]');

    if (!hiddenInput) {
      throw new Error("hidden file input not found");
    }

    await user.upload(hiddenInput as HTMLInputElement, file);

    expect(onUploadFile).toHaveBeenCalledWith(file);
  });

  it("triggers a rescan without forcing a rehash by default", async () => {
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
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rescan" }));

    expect(onRescan).toHaveBeenCalledWith(false);
  });

  it("triggers a rescan with forceRehash once Full rehash is toggled on", async () => {
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
      />,
    );
    await user.click(screen.getByRole("button", { name: "Full rehash" }));
    await user.click(screen.getByRole("button", { name: "Rescan" }));

    expect(onRescan).toHaveBeenCalledWith(true);
  });

  it("marks Full rehash as pressed once toggled on, and unpressed by default", async () => {
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
      />,
    );
    const rehashButton = screen.getByRole("button", { name: "Full rehash" });

    expect(rehashButton).toHaveAttribute("aria-pressed", "false");

    await user.click(rehashButton);

    expect(rehashButton).toHaveAttribute("aria-pressed", "true");
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
      />,
    );

    expect(screen.getByRole("button", { name: "New folder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload file" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rescan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Full rehash" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Convert" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sync" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reconcile" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Foundry" })).toBeDisabled();
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
      />,
    );
    await user.click(screen.getByRole("button", { name: "Convert" }));

    expect(onConvert).toHaveBeenCalled();
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
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reconcile" }));

    expect(onReconcile).toHaveBeenCalled();
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
      />,
    );

    expect(screen.getByTestId("foundry-pending-badge")).toBeInTheDocument();
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
      />,
    );

    expect(screen.queryByTestId("foundry-pending-badge")).not.toBeInTheDocument();
  });
});
