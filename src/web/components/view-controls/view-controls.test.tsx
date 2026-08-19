// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ViewControls, type ViewControlsProps } from "./view-controls.tsx";

const defaultProps: ViewControlsProps = {
  viewMode: "table",
  onViewModeChange: vi.fn(),
  sortCriterion: "name",
  sortDirection: "asc",
  onSortCriterionClick: vi.fn(),
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

  it("calls onSortCriterionClick with the clicked criterion", async () => {
    const user = userEvent.setup();
    const onSortCriterionClick = vi.fn();

    render(<ViewControls {...defaultProps} onSortCriterionClick={onSortCriterionClick} />);
    await user.click(screen.getByRole("button", { name: "Sort by size" }));

    expect(onSortCriterionClick).toHaveBeenCalledWith("size");
  });

  it("shows a direction indicator only on the active sort criterion button", () => {
    render(<ViewControls {...defaultProps} sortCriterion="name" />);

    expect(screen.getByTestId("sort-direction-icon-name")).toBeInTheDocument();
    expect(screen.queryByTestId("sort-direction-icon-type")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sort-direction-icon-size")).not.toBeInTheDocument();
  });

  it("calls onGroupCriterionChange with the clicked criterion", async () => {
    const user = userEvent.setup();
    const onGroupCriterionChange = vi.fn();

    render(<ViewControls {...defaultProps} onGroupCriterionChange={onGroupCriterionChange} />);
    await user.click(screen.getByRole("button", { name: "Group by tag" }));

    expect(onGroupCriterionChange).toHaveBeenCalledWith("tag");
  });
});
