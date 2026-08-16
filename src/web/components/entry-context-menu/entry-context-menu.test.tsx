// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { EntryContextMenu } from "./entry-context-menu.tsx";

const fileEntry: DirectoryEntry = { name: "map.png", type: "file", size: 10, tags: ["npc"] };
const directoryEntry: DirectoryEntry = { name: "tiles", type: "directory" };

const baseProps = {
  position: { x: 10, y: 20 },
  onClose: vi.fn(),
  onView: vi.fn(),
  onRenameRequested: vi.fn(),
  onDelete: vi.fn(),
  availableTags: ["npc", "loot"],
  onTagsChange: vi.fn(),
};

describe("EntryContextMenu", () => {
  it("calls onRenameRequested and onClose when Rename is clicked", async () => {
    const user = userEvent.setup();
    const onRenameRequested = vi.fn();
    const onClose = vi.fn();

    render(
      <EntryContextMenu
        {...baseProps}
        entry={fileEntry}
        onRenameRequested={onRenameRequested}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rename" }));

    expect(onRenameRequested).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a confirmation step on Delete without closing the menu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDelete = vi.fn();

    render(
      <EntryContextMenu {...baseProps} entry={fileEntry} onClose={onClose} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText('Delete "map.png"?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onDelete and onClose when Confirm is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDelete = vi.fn();

    render(
      <EntryContextMenu {...baseProps} entry={fileEntry} onClose={onClose} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDelete).toHaveBeenCalledWith(fileEntry);
    expect(onClose).toHaveBeenCalled();
  });

  it("returns to the item list when Cancel is clicked", async () => {
    const user = userEvent.setup();

    render(<EntryContextMenu {...baseProps} entry={fileEntry} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByText('Delete "map.png"?')).not.toBeInTheDocument();
  });

  it("renders the tag editor for a file entry and forwards onTagsChange", async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();

    render(<EntryContextMenu {...baseProps} entry={fileEntry} onTagsChange={onTagsChange} />);

    expect(screen.getByText("npc")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(fileEntry, ["npc", "loot"]);
  });

  it("does not render a tags section for a directory entry", () => {
    render(<EntryContextMenu {...baseProps} entry={directoryEntry} />);

    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });

  it("shows View for a previewable file and calls onView then onClose", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onClose = vi.fn();

    render(<EntryContextMenu {...baseProps} entry={fileEntry} onView={onView} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onView).toHaveBeenCalledWith(fileEntry);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not show View for a directory entry", () => {
    render(<EntryContextMenu {...baseProps} entry={directoryEntry} />);

    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
  });

  it("does not show View for an unsupported file type", () => {
    const unsupportedEntry: DirectoryEntry = { name: "notes.xcf", type: "file" };

    render(<EntryContextMenu {...baseProps} entry={unsupportedEntry} />);

    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
  });
});
