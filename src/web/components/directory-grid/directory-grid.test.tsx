// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { DirectoryGrid } from "./directory-grid.tsx";

const directoryEntry: DirectoryEntry = { name: "tiles", type: "directory" };
const fileEntry: DirectoryEntry = { name: "map.png", type: "file", size: 2048 };

const baseProps = {
  currentPath: "tiles",
  onOpenDirectory: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onMove: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  canDropEntry: () => false,
  onDropEntry: vi.fn(),
  availableTags: [] as string[],
  onTagsChange: vi.fn(),
  selectedNames: new Set<string>(),
  onSelectRow: vi.fn(),
};

describe("DirectoryGrid", () => {
  it("renders a name button for directories and plain text for files", () => {
    render(
      <DirectoryGrid
        {...baseProps}
        groups={[{ label: null, entries: [directoryEntry, fileEntry] }]}
      />,
    );

    expect(screen.getByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });

  it("opens a directory on click", async () => {
    const user = userEvent.setup();
    const onOpenDirectory = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onOpenDirectory={onOpenDirectory}
        groups={[{ label: null, entries: [directoryEntry] }]}
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
      <DirectoryGrid
        {...baseProps}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Move" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onRename).toHaveBeenCalledWith(fileEntry);
    expect(onMove).toHaveBeenCalledWith(fileEntry);
    expect(onDelete).toHaveBeenCalledWith(fileEntry);
  });

  it("calls onDragStart and onDragEnd", () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    const tile = screen.getByTestId("tile-map.png");

    fireEvent.dragStart(tile);
    expect(onDragStart).toHaveBeenCalledWith(fileEntry);

    fireEvent.dragEnd(tile);
    expect(onDragEnd).toHaveBeenCalled();
  });

  it("calls onDropEntry when a tile canDropEntry approves receives a drop", () => {
    const onDropEntry = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        canDropEntry={() => true}
        onDropEntry={onDropEntry}
        groups={[{ label: null, entries: [directoryEntry] }]}
      />,
    );
    const tile = screen.getByTestId("tile-tiles");

    fireEvent.dragOver(tile);
    fireEvent.drop(tile);

    expect(onDropEntry).toHaveBeenCalledWith(directoryEntry);
  });

  it("does not call onDropEntry when canDropEntry rejects the target", () => {
    const onDropEntry = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onDropEntry={onDropEntry}
        groups={[{ label: null, entries: [directoryEntry] }]}
      />,
    );
    const tile = screen.getByTestId("tile-tiles");

    fireEvent.dragOver(tile);
    fireEvent.drop(tile);

    expect(onDropEntry).not.toHaveBeenCalled();
  });

  it("renders a large preview using the entry's path joined with the current directory", () => {
    render(<DirectoryGrid {...baseProps} groups={[{ label: null, entries: [fileEntry] }]} />);

    expect(screen.getByRole("img", { name: "map.png" })).toHaveAttribute(
      "src",
      "/api/files/raw?path=tiles%2Fmap.png",
    );
    expect(screen.getByRole("img", { name: "map.png" })).toHaveAttribute("data-size", "large");
  });

  it("renders a tag editor for file tiles and calls onTagsChange when a tag is added", async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();
    const taggedFile: DirectoryEntry = { name: "npc.png", type: "file", size: 10, tags: ["npc"] };

    render(
      <DirectoryGrid
        {...baseProps}
        availableTags={["npc", "loot"]}
        onTagsChange={onTagsChange}
        groups={[{ label: null, entries: [taggedFile] }]}
      />,
    );

    expect(screen.getByText("npc")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(taggedFile, ["npc", "loot"]);
  });

  it("does not render a tag editor for directory tiles", () => {
    render(<DirectoryGrid {...baseProps} groups={[{ label: null, entries: [directoryEntry] }]} />);

    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });

  it("marks a tile that is in the selected set", () => {
    render(
      <DirectoryGrid
        {...baseProps}
        selectedNames={new Set(["map.png"])}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    expect(screen.getByTestId("tile-map.png")).toHaveAttribute("aria-selected", "true");
  });

  it("calls onSelectRow with a replace modifier on a plain click", async () => {
    const user = userEvent.setup();
    const onSelectRow = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    await user.click(screen.getByTestId("tile-map.png"));

    expect(onSelectRow).toHaveBeenCalledWith(fileEntry, "replace");
  });

  it("calls onSelectRow with a toggle modifier on ctrl+click", () => {
    const onSelectRow = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.click(screen.getByTestId("tile-map.png"), { ctrlKey: true });

    expect(onSelectRow).toHaveBeenCalledWith(fileEntry, "toggle");
  });

  it("renders a heading for each labeled group", () => {
    render(
      <DirectoryGrid
        {...baseProps}
        groups={[
          { label: "Folders", entries: [directoryEntry] },
          { label: "npc", entries: [fileEntry] },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Folders" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "npc" })).toBeInTheDocument();
  });
});
