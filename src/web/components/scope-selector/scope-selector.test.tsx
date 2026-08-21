// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ScopeSelector, type ScopeSelectorProps } from "./scope-selector.tsx";

const defaultProps: ScopeSelectorProps = {
  scope: "folder",
  onScopeChange: vi.fn(),
  directoryLabel: "tiles",
};

describe("ScopeSelector", () => {
  it("labels each option using the directory label", () => {
    render(<ScopeSelector {...defaultProps} />);

    expect(screen.getByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tiles + subfolders" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All folders" })).toBeInTheDocument();
  });

  it("marks the current scope as pressed", () => {
    render(<ScopeSelector {...defaultProps} scope="subtree" />);

    expect(screen.getByRole("button", { name: "tiles + subfolders" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "tiles" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "All folders" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onScopeChange with the clicked scope", async () => {
    const user = userEvent.setup();
    const onScopeChange = vi.fn();

    render(<ScopeSelector {...defaultProps} onScopeChange={onScopeChange} />);
    await user.click(screen.getByRole("button", { name: "All folders" }));

    expect(onScopeChange).toHaveBeenCalledWith("all");
  });
});
