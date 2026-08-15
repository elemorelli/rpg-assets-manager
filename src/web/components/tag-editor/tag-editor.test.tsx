// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagEditor } from "./tag-editor.tsx";

describe("TagEditor", () => {
  it("renders existing tags as chips", () => {
    render(
      <TagEditor entryKey="a.png" tags={["npc", "loot"]} availableTags={[]} onChange={vi.fn()} />,
    );

    expect(screen.getByText("npc")).toBeInTheDocument();
    expect(screen.getByText("loot")).toBeInTheDocument();
  });

  it("adds a new tag on Enter and clears the input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TagEditor entryKey="a.png" tags={["npc"]} availableTags={[]} onChange={onChange} />);

    const input = screen.getByLabelText("Add tag");
    await user.type(input, "loot{Enter}");

    expect(onChange).toHaveBeenCalledWith(["npc", "loot"]);
    expect(input).toHaveValue("");
  });

  it("removes a tag when its remove button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TagEditor entryKey="a.png" tags={["npc", "loot"]} availableTags={[]} onChange={onChange} />,
    );

    await user.click(screen.getByLabelText("Remove tag npc"));

    expect(onChange).toHaveBeenCalledWith(["loot"]);
  });

  it("does not add a duplicate of a tag that's already present", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TagEditor entryKey="a.png" tags={["npc"]} availableTags={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText("Add tag"), "npc{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });
});
