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
        onLogout={vi.fn()}
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
        onLogout={vi.fn()}
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
        onLogout={vi.fn()}
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
        onLogout={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rescan" }));

    expect(onRescan).toHaveBeenCalledWith(false);
  });

  it("triggers a rescan with forceRehash when the Full rehash checkbox is checked", async () => {
    const user = userEvent.setup();
    const onRescan = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={onRescan}
        onLogout={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Full rehash" }));
    await user.click(screen.getByRole("button", { name: "Rescan" }));

    expect(onRescan).toHaveBeenCalledWith(true);
  });

  it("disables its buttons and checkbox while busy", () => {
    render(
      <Toolbar
        busy={true}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onLogout={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "New folder" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload file" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rescan" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Full rehash" })).toBeDisabled();
  });

  it("calls onLogout when the Log out button is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <Toolbar
        busy={false}
        onCreateDirectory={vi.fn()}
        onUploadFile={vi.fn()}
        onRescan={vi.fn()}
        onLogout={onLogout}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(onLogout).toHaveBeenCalled();
  });
});
