// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DirectoryActionsMenu } from "./directory-actions-menu.tsx";

const baseProps = {
  position: { x: 10, y: 20 },
  onClose: vi.fn(),
  onCreateDirectory: vi.fn(),
  onUploadFile: vi.fn(),
  onConvert: vi.fn(),
  onRehashRequested: vi.fn(),
  onReconcile: vi.fn(),
};

describe("DirectoryActionsMenu", () => {
  let promptSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    promptSpy = vi.spyOn(window, "prompt");
  });

  afterEach(() => {
    promptSpy.mockRestore();
  });

  it("asks for a directory name, forwards it, and closes the menu on confirmation", async () => {
    const user = userEvent.setup();
    const onCreateDirectory = vi.fn();
    const onClose = vi.fn();
    promptSpy.mockReturnValue("legacy-pack");

    render(
      <DirectoryActionsMenu
        {...baseProps}
        onCreateDirectory={onCreateDirectory}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "New directory" }));

    expect(onCreateDirectory).toHaveBeenCalledWith("legacy-pack");
    expect(onClose).toHaveBeenCalled();
  });

  it("does not create a directory but still closes the menu when the prompt is dismissed", async () => {
    const user = userEvent.setup();
    const onCreateDirectory = vi.fn();
    const onClose = vi.fn();
    promptSpy.mockReturnValue(null);

    render(
      <DirectoryActionsMenu
        {...baseProps}
        onCreateDirectory={onCreateDirectory}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "New directory" }));

    expect(onCreateDirectory).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("forwards a selected file to onUploadFile and closes the menu", async () => {
    const user = userEvent.setup();
    const onUploadFile = vi.fn();
    const onClose = vi.fn();
    const file = new File(["content"], "map.png", { type: "image/png" });

    render(<DirectoryActionsMenu {...baseProps} onUploadFile={onUploadFile} onClose={onClose} />);
    const hiddenInput = document.querySelector('input[type="file"]');

    if (!hiddenInput) {
      throw new Error("hidden file input not found");
    }

    await user.upload(hiddenInput as HTMLInputElement, file);

    expect(onUploadFile).toHaveBeenCalledWith(file);
    expect(onClose).toHaveBeenCalled();
  });

  it("triggers onConvert and closes the menu when Convert is clicked", async () => {
    const user = userEvent.setup();
    const onConvert = vi.fn();
    const onClose = vi.fn();

    render(<DirectoryActionsMenu {...baseProps} onConvert={onConvert} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Convert" }));

    expect(onConvert).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render Convert when onConvert is not provided", () => {
    const { onConvert: _onConvert, ...propsWithoutConvert } = baseProps;

    render(<DirectoryActionsMenu {...propsWithoutConvert} />);

    expect(screen.queryByRole("button", { name: "Convert" })).not.toBeInTheDocument();
  });

  it("triggers onRehashRequested and closes the menu when Full rehash is clicked", async () => {
    const user = userEvent.setup();
    const onRehashRequested = vi.fn();
    const onClose = vi.fn();

    render(
      <DirectoryActionsMenu
        {...baseProps}
        onRehashRequested={onRehashRequested}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Full rehash" }));

    expect(onRehashRequested).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render Full rehash when onRehashRequested is not provided", () => {
    const { onRehashRequested: _onRehashRequested, ...propsWithoutRehash } = baseProps;

    render(<DirectoryActionsMenu {...propsWithoutRehash} />);

    expect(screen.queryByRole("button", { name: "Full rehash" })).not.toBeInTheDocument();
  });

  it("triggers onReconcile and closes the menu when Reconcile is clicked", async () => {
    const user = userEvent.setup();
    const onReconcile = vi.fn();
    const onClose = vi.fn();

    render(<DirectoryActionsMenu {...baseProps} onReconcile={onReconcile} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Reconcile" }));

    expect(onReconcile).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render Reconcile when onReconcile is not provided", () => {
    const { onReconcile: _onReconcile, ...propsWithoutReconcile } = baseProps;

    render(<DirectoryActionsMenu {...propsWithoutReconcile} />);

    expect(screen.queryByRole("button", { name: "Reconcile" })).not.toBeInTheDocument();
  });
});
