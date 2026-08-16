// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ViewControls, type ViewControlsProps } from "./view-controls.tsx";

const defaultProps: ViewControlsProps = {
  viewMode: "table",
  onViewModeChange: vi.fn(),
  sortCriterion: "name",
  onSortCriterionChange: vi.fn(),
  sortDirection: "asc",
  onSortDirectionChange: vi.fn(),
  groupCriterion: "none",
  onGroupCriterionChange: vi.fn(),
};

describe("ViewControls", () => {
  it("marks the current view mode as pressed", () => {
    render(<ViewControls {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Table view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onViewModeChange when switching to grid", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();

    render(<ViewControls {...defaultProps} onViewModeChange={onViewModeChange} />);
    await user.click(screen.getByRole("button", { name: "Grid view" }));

    expect(onViewModeChange).toHaveBeenCalledWith("grid");
  });

  it("calls onSortCriterionChange with the clicked criterion", async () => {
    const user = userEvent.setup();
    const onSortCriterionChange = vi.fn();

    render(<ViewControls {...defaultProps} onSortCriterionChange={onSortCriterionChange} />);
    await user.click(screen.getByRole("button", { name: "Sort by size" }));

    expect(onSortCriterionChange).toHaveBeenCalledWith("size");
  });

  it("toggles the sort direction from ascending to descending", async () => {
    const user = userEvent.setup();
    const onSortDirectionChange = vi.fn();

    render(<ViewControls {...defaultProps} onSortDirectionChange={onSortDirectionChange} />);
    await user.click(screen.getByRole("button", { name: "Ascending" }));

    expect(onSortDirectionChange).toHaveBeenCalledWith("desc");
  });

  it("shows the Descending label when direction is desc", () => {
    render(<ViewControls {...defaultProps} sortDirection="desc" />);

    expect(screen.getByRole("button", { name: "Descending" })).toBeInTheDocument();
  });

  it("calls onGroupCriterionChange with the clicked criterion", async () => {
    const user = userEvent.setup();
    const onGroupCriterionChange = vi.fn();

    render(<ViewControls {...defaultProps} onGroupCriterionChange={onGroupCriterionChange} />);
    await user.click(screen.getByRole("button", { name: "Group by tag" }));

    expect(onGroupCriterionChange).toHaveBeenCalledWith("tag");
  });
});
