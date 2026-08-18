// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./modal.tsx";

describe("Modal", () => {
  it("renders the title and children", () => {
    render(
      <Modal title="Convert assets" onClose={vi.fn()}>
        <p>Body content</p>
      </Modal>,
    );

    expect(screen.getByText("Convert assets")).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("renders the footer when given one", () => {
    render(
      <Modal
        title="Convert assets"
        onClose={vi.fn()}
        footer={<button type="button">Confirm</button>}>
        <p>Body content</p>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal title="Convert assets" onClose={onClose}>
        <p>Body content</p>
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal title="Convert assets" onClose={onClose}>
        <p>Body content</p>
      </Modal>,
    );
    await user.click(screen.getByTestId("modal-backdrop"));

    expect(onClose).toHaveBeenCalled();
  });

  it("does not call onClose when the dialog content is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal title="Convert assets" onClose={onClose}>
        <p>Body content</p>
      </Modal>,
    );
    await user.click(screen.getByText("Body content"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal title="Convert assets" onClose={onClose}>
        <p>Body content</p>
      </Modal>,
    );
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
