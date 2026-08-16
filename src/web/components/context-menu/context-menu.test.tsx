// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContextMenu } from "./context-menu.tsx";

describe("ContextMenu", () => {
  it("renders nothing when position is null", () => {
    render(
      <ContextMenu position={null} onClose={vi.fn()}>
        <button type="button">Rename</button>
      </ContextMenu>,
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders its children at the given position when open", () => {
    render(
      <ContextMenu position={{ x: 10, y: 20 }} onClose={vi.fn()}>
        <button type="button">Rename</button>
      </ContextMenu>,
    );

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
  });

  it("portal-renders outside its parent's DOM subtree", () => {
    const { container } = render(
      <ContextMenu position={{ x: 10, y: 20 }} onClose={vi.fn()}>
        <button type="button">Rename</button>
      </ContextMenu>,
    );

    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument();
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });

  it("closes on an outside mousedown", () => {
    const onClose = vi.fn();

    render(
      <ContextMenu position={{ x: 10, y: 20 }} onClose={onClose}>
        <button type="button">Rename</button>
      </ContextMenu>,
    );
    fireEvent.mouseDown(document.body);

    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on a mousedown inside the menu", () => {
    const onClose = vi.fn();

    render(
      <ContextMenu position={{ x: 10, y: 20 }} onClose={onClose}>
        <button type="button">Rename</button>
      </ContextMenu>,
    );
    fireEvent.mouseDown(screen.getByRole("button", { name: "Rename" }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();

    render(
      <ContextMenu position={{ x: 10, y: 20 }} onClose={onClose}>
        <button type="button">Rename</button>
      </ContextMenu>,
    );
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
