// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { DirectoryTable } from "./directory-table.tsx";

const directoryEntry: DirectoryEntry = { name: "tiles", type: "directory" };
const fileEntry: DirectoryEntry = { name: "map.png", type: "file", size: 2048 };

describe("DirectoryTable", () => {
  it("renders a name button for directories and plain text for files", () => {
    render(
      <DirectoryTable
        entries={[directoryEntry, fileEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.getByText("map.png")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "map.png" })).not.toBeInTheDocument();
  });

  it("shows the formatted size for files, and nothing for directories", () => {
    render(
      <DirectoryTable
        entries={[directoryEntry, fileEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );

    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("opens a directory on click", async () => {
    const user = userEvent.setup();
    const onOpenDirectory = vi.fn();

    render(
      <DirectoryTable
        entries={[directoryEntry]}
        currentPath="tiles"
        onOpenDirectory={onOpenDirectory}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "tiles" }));

    expect(onOpenDirectory).toHaveBeenCalledWith("tiles");
  });

  it("forwards the entry to onRename, onMove, and onDelete", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    const onMove = vi.fn();
    const onDelete = vi.fn();

    render(
      <DirectoryTable
        entries={[fileEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={onRename}
        onDelete={onDelete}
        onMove={onMove}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Move" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onRename).toHaveBeenCalledWith(fileEntry);
    expect(onMove).toHaveBeenCalledWith(fileEntry);
    expect(onDelete).toHaveBeenCalledWith(fileEntry);
  });

  it("calls onDragStart with the source entry, and onDragEnd when the drag ends", () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <DirectoryTable
        entries={[fileEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );
    const row = screen.getByText("map.png").closest("tr");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.dragStart(row);
    expect(onDragStart).toHaveBeenCalledWith(fileEntry);

    fireEvent.dragEnd(row);
    expect(onDragEnd).toHaveBeenCalled();
  });

  it("calls onDropEntry when a row canDropEntry approves receives a drop", () => {
    const onDropEntry = vi.fn();

    render(
      <DirectoryTable
        entries={[directoryEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => true}
        onDropEntry={onDropEntry}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: "tiles" }).closest("tr");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.dragOver(row);
    fireEvent.drop(row);

    expect(onDropEntry).toHaveBeenCalledWith(directoryEntry);
  });

  it("does not call onDropEntry when canDropEntry rejects the target", () => {
    const onDropEntry = vi.fn();

    render(
      <DirectoryTable
        entries={[directoryEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={onDropEntry}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: "tiles" }).closest("tr");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.dragOver(row);
    fireEvent.drop(row);

    expect(onDropEntry).not.toHaveBeenCalled();
  });

  it("renders a preview using the entry's path joined with the current directory", () => {
    render(
      <DirectoryTable
        entries={[fileEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "map.png" })).toHaveAttribute(
      "src",
      "/api/files/raw?path=tiles%2Fmap.png",
    );
  });

  it("renders a tag editor for file rows and calls onTagsChange when a tag is added", async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();
    const taggedFile: DirectoryEntry = { name: "npc.png", type: "file", size: 10, tags: ["npc"] };

    render(
      <DirectoryTable
        entries={[taggedFile]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={["npc", "loot"]}
        onTagsChange={onTagsChange}
      />,
    );

    expect(screen.getByText("npc")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(taggedFile, ["npc", "loot"]);
  });

  it("does not render a tag editor for directory rows", () => {
    render(
      <DirectoryTable
        entries={[directoryEntry]}
        currentPath="tiles"
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
        onDragStart={vi.fn()}
        onDragEnd={vi.fn()}
        canDropEntry={() => false}
        onDropEntry={vi.fn()}
        availableTags={[]}
        onTagsChange={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });
});
