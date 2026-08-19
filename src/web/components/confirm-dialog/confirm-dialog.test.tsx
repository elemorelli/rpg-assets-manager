// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./confirm-dialog.tsx";

describe("ConfirmDialog", () => {
  it("renders the title and message", () => {
    render(
      <ConfirmDialog
        title="Delete file"
        message='Delete "map.png"?'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Delete file")).toBeInTheDocument();
    expect(screen.getByText('Delete "map.png"?')).toBeInTheDocument();
  });

  it("uses Confirm and Cancel as the default button labels", () => {
    render(
      <ConfirmDialog title="Delete file" message="Sure?" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("supports custom button labels", () => {
    render(
      <ConfirmDialog
        title="Full rehash"
        message="This may take a while."
        confirmLabel="Rehash"
        cancelLabel="Not now"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Rehash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        title="Delete file"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog title="Delete file" message="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog title="Delete file" message="Sure?" onConfirm={vi.fn()} onCancel={onCancel} />,
    );
    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalled();
  });
});
