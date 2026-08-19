// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { LightboxDetails } from "./lightbox-details.tsx";

const entry: DirectoryEntry = {
  name: "map.png",
  type: "file",
  size: 2048,
  mtimeMs: 1750000000000,
  tags: ["npc"],
};

const baseProps = {
  onRename: vi.fn(),
  onDelete: vi.fn(),
  availableTags: ["npc", "loot"],
  onTagsChange: vi.fn(),
};

describe("LightboxDetails", () => {
  it("renders type, size, and modified date", () => {
    render(<LightboxDetails {...baseProps} entry={entry} />);

    expect(screen.getByText("file")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(
      screen.getByText(new Date(entry.mtimeMs as number).toLocaleString()),
    ).toBeInTheDocument();
  });

  it("omits size and modified fields when not present on the entry", () => {
    render(<LightboxDetails {...baseProps} entry={{ name: "map.png", type: "file", tags: [] }} />);

    expect(screen.queryByText("Size")).not.toBeInTheDocument();
    expect(screen.queryByText("Modified")).not.toBeInTheDocument();
  });

  it("renames on Enter", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onRename={onRename} />);
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const input = screen.getByLabelText("Rename map.png");
    await user.clear(input);
    await user.type(input, "castle.png{Enter}");

    expect(onRename).toHaveBeenCalledWith(entry, "castle.png");
  });

  it("cancels renaming on Escape without calling onRename", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onRename={onRename} />);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.type(screen.getByLabelText("Rename map.png"), "{Escape}");

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });

  it("shows a delete confirmation before calling onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText('Delete "map.png"?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onDelete).toHaveBeenCalledWith(entry);
  });

  it("labels the tags section", () => {
    render(<LightboxDetails {...baseProps} entry={entry} />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("forwards tag changes via TagEditor", async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onTagsChange={onTagsChange} />);
    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(entry, ["npc", "loot"]);
  });
});
