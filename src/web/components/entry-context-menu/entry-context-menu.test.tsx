// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { EntryContextMenu } from "./entry-context-menu.tsx";

const fileEntry: DirectoryEntry = { name: "map.png", type: "file", size: 10, tags: ["npc"] };
const otherFileEntry: DirectoryEntry = { name: "portrait.png", type: "file", size: 20 };
const directoryEntry: DirectoryEntry = { name: "tiles", type: "directory" };

const baseProps = {
  position: { x: 10, y: 20 },
  onClose: vi.fn(),
  onView: vi.fn(),
  onRenameRequested: vi.fn(),
  onDelete: vi.fn(),
  onDeleteMany: vi.fn(),
  availableTags: ["npc", "loot"],
  onTagsChange: vi.fn(),
  onAddTagToMany: vi.fn(),
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
        selectedEntries={[fileEntry]}
        onRenameRequested={onRenameRequested}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Rename" }));

    expect(onRenameRequested).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("opens a delete confirmation popup and closes the menu when Delete is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDelete = vi.fn();

    render(
      <EntryContextMenu
        {...baseProps}
        entry={fileEntry}
        selectedEntries={[fileEntry]}
        onClose={onClose}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText('Delete "map.png"?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onDelete when Confirm is clicked in the popup", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <EntryContextMenu
        {...baseProps}
        entry={fileEntry}
        selectedEntries={[fileEntry]}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDelete).toHaveBeenCalledWith(fileEntry);
  });

  it("dismisses the confirmation popup without calling onDelete when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <EntryContextMenu
        {...baseProps}
        entry={fileEntry}
        selectedEntries={[fileEntry]}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete "map.png"?')).not.toBeInTheDocument();
  });

  it("renders the tag editor for a file entry and forwards onTagsChange", async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();

    render(
      <EntryContextMenu
        {...baseProps}
        entry={fileEntry}
        selectedEntries={[fileEntry]}
        onTagsChange={onTagsChange}
      />,
    );

    expect(screen.getByText("npc")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(fileEntry, ["npc", "loot"]);
  });

  it("does not render a tags section for a directory entry", () => {
    render(
      <EntryContextMenu {...baseProps} entry={directoryEntry} selectedEntries={[directoryEntry]} />,
    );

    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });

  it("shows View for a previewable file and calls onView then onClose", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onClose = vi.fn();

    render(
      <EntryContextMenu
        {...baseProps}
        entry={fileEntry}
        selectedEntries={[fileEntry]}
        onView={onView}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onView).toHaveBeenCalledWith(fileEntry);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not show View for a directory entry", () => {
    render(
      <EntryContextMenu {...baseProps} entry={directoryEntry} selectedEntries={[directoryEntry]} />,
    );

    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
  });

  it("does not show View for an unsupported file type", () => {
    const unsupportedEntry: DirectoryEntry = { name: "notes.xcf", type: "file" };

    render(
      <EntryContextMenu
        {...baseProps}
        entry={unsupportedEntry}
        selectedEntries={[unsupportedEntry]}
      />,
    );

    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
  });

  describe("with a multi-entry selection", () => {
    const selectedEntries = [fileEntry, otherFileEntry, directoryEntry];

    it("hides View and Rename", () => {
      render(
        <EntryContextMenu {...baseProps} entry={fileEntry} selectedEntries={selectedEntries} />,
      );

      expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
    });

    it("shows a batch delete confirmation and calls onDeleteMany with the whole selection", async () => {
      const user = userEvent.setup();
      const onDeleteMany = vi.fn();
      const onDelete = vi.fn();

      render(
        <EntryContextMenu
          {...baseProps}
          entry={fileEntry}
          selectedEntries={selectedEntries}
          onDelete={onDelete}
          onDeleteMany={onDeleteMany}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Delete 3 items" }));

      expect(screen.getByText("Delete 3 items?")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(onDeleteMany).toHaveBeenCalledWith(selectedEntries);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("adds a tag to every selected file entry, skipping directories", async () => {
      const user = userEvent.setup();
      const onAddTagToMany = vi.fn();

      render(
        <EntryContextMenu
          {...baseProps}
          entry={fileEntry}
          selectedEntries={selectedEntries}
          onAddTagToMany={onAddTagToMany}
        />,
      );

      await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

      expect(onAddTagToMany).toHaveBeenCalledWith([fileEntry, otherFileEntry], "loot");
    });

    it("hides the tags section when only directories are selected", () => {
      render(
        <EntryContextMenu
          {...baseProps}
          entry={directoryEntry}
          selectedEntries={[directoryEntry, { name: "props", type: "directory" }]}
        />,
      );

      expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
    });
  });
});
