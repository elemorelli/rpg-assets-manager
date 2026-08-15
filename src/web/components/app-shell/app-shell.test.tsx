// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AppShell } from "./app-shell.tsx";

describe("AppShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the sidebar, main, and drawer content in their own regions", () => {
    render(<AppShell sidebar={<p>Tree</p>} main={<p>Files</p>} drawer={<p>Panels</p>} />);

    expect(screen.getByText("Tree")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText("Panels")).toBeInTheDocument();
  });

  it("restores a previously persisted sidebar width from localStorage on mount", () => {
    window.localStorage.setItem("sidebarWidth", "320");

    render(<AppShell sidebar={<p>Tree</p>} main={<p>Files</p>} drawer={<p>Panels</p>} />);

    expect(screen.getByTestId("app-shell")).toHaveStyle({ "--sidebar-width": "320px" });
  });

  it("persists a new sidebar width to localStorage after dragging the resize handle", () => {
    render(<AppShell sidebar={<p>Tree</p>} main={<p>Files</p>} drawer={<p>Panels</p>} />);
    const handle = screen.getByRole("button", { name: "Resize sidebar" });

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 160 });
    fireEvent.mouseUp(window);

    expect(window.localStorage.getItem("sidebarWidth")).toBe("320");
    expect(screen.getByTestId("app-shell")).toHaveStyle({ "--sidebar-width": "320px" });
  });

  it("clamps the width to the minimum when dragged far past it", () => {
    render(<AppShell sidebar={<p>Tree</p>} main={<p>Files</p>} drawer={<p>Panels</p>} />);
    const handle = screen.getByRole("button", { name: "Resize sidebar" });

    fireEvent.mouseDown(handle, { clientX: 500 });
    fireEvent.mouseMove(window, { clientX: 0 });
    fireEvent.mouseUp(window);

    expect(window.localStorage.getItem("sidebarWidth")).toBe("180");
  });
});
