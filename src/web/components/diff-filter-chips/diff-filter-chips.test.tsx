// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DiffFilterChips } from "./diff-filter-chips.tsx";

describe("DiffFilterChips", () => {
  it("renders one chip per item with its count and label", () => {
    render(
      <DiffFilterChips
        items={[
          { id: "added", label: "added", count: 1 },
          { id: "removed", label: "deleted", count: 2 },
        ]}
        hiddenIds={new Set()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "1 added" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 deleted" })).toBeInTheDocument();
  });

  it("marks a chip as pressed when its id is not hidden", () => {
    render(
      <DiffFilterChips
        items={[{ id: "added", label: "added", count: 1 }]}
        hiddenIds={new Set()}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "1 added" })).toHaveAttribute("aria-pressed", "true");
  });

  it("marks a chip as not pressed when its id is hidden", () => {
    render(
      <DiffFilterChips
        items={[{ id: "added", label: "added", count: 1 }]}
        hiddenIds={new Set(["added"])}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "1 added" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onToggle with the clicked item's id", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <DiffFilterChips
        items={[{ id: "added", label: "added", count: 1 }]}
        hiddenIds={new Set()}
        onToggle={onToggle}
      />,
    );
    await user.click(screen.getByRole("button", { name: "1 added" }));

    expect(onToggle).toHaveBeenCalledWith("added");
  });

  it("disables a chip whose count is zero and does not call onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <DiffFilterChips
        items={[{ id: "modified", label: "modified", count: 0 }]}
        hiddenIds={new Set()}
        onToggle={onToggle}
      />,
    );
    const chip = screen.getByRole("button", { name: "0 modified" });

    expect(chip).toBeDisabled();

    await user.click(chip);

    expect(onToggle).not.toHaveBeenCalled();
  });
});
