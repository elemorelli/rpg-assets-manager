// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagFilter } from "./tag-filter.tsx";

describe("TagFilter", () => {
  it("renders a button per available tag", () => {
    render(<TagFilter availableTags={["npc", "loot"]} selectedTags={[]} onToggleTag={vi.fn()} />);

    expect(screen.getByRole("button", { name: "npc" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "loot" })).toBeInTheDocument();
  });

  it("marks selected tags as pressed", () => {
    render(
      <TagFilter availableTags={["npc", "loot"]} selectedTags={["npc"]} onToggleTag={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "npc" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "loot" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onToggleTag with the clicked tag", async () => {
    const user = userEvent.setup();
    const onToggleTag = vi.fn();

    render(<TagFilter availableTags={["npc"]} selectedTags={[]} onToggleTag={onToggleTag} />);

    await user.click(screen.getByRole("button", { name: "npc" }));

    expect(onToggleTag).toHaveBeenCalledWith("npc");
  });
});
