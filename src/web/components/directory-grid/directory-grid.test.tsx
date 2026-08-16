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
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  canDropEntry: () => false,
  onDropEntry: vi.fn(),
  availableTags: [] as string[],
  onTagsChange: vi.fn(),
  selectedNames: new Set<string>(),
  onSelectRow: vi.fn(),
  onOpenLightbox: vi.fn(),
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

  it("renders read-only tag badges for file tiles", () => {
    const taggedFile: DirectoryEntry = { name: "npc.png", type: "file", size: 10, tags: ["npc"] };

    render(<DirectoryGrid {...baseProps} groups={[{ label: null, entries: [taggedFile] }]} />);

    expect(screen.getByText("npc")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });

  it("does not render tag badges for directory tiles", () => {
    render(<DirectoryGrid {...baseProps} groups={[{ label: null, entries: [directoryEntry] }]} />);

    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });

  it("allows editing tags through the context menu for file tiles", async () => {
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

    fireEvent.contextMenu(screen.getByTestId("tile-npc.png"));
    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(taggedFile, ["npc", "loot"]);
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

  it("opens the context menu on right-click without also calling onSelectRow", () => {
    const onSelectRow = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.contextMenu(screen.getByTestId("tile-map.png"));

    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(onSelectRow).not.toHaveBeenCalled();
  });

  it("opens the context menu via the actions button without also calling onSelectRow", async () => {
    const user = userEvent.setup();
    const onSelectRow = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions for map.png" }));

    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(onSelectRow).not.toHaveBeenCalled();
  });

  it("closes the previously open menu when a second entry's menu is opened", () => {
    render(
      <DirectoryGrid
        {...baseProps}
        groups={[{ label: null, entries: [directoryEntry, fileEntry] }]}
      />,
    );
    const directoryTile = screen.getByTestId("tile-tiles");
    const fileTile = screen.getByTestId("tile-map.png");

    fireEvent.mouseDown(directoryTile);
    fireEvent.contextMenu(directoryTile);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(fileTile);
    fireEvent.contextMenu(fileTile);

    expect(screen.getAllByRole("menu")).toHaveLength(1);
  });

  it("renames an entry via the inline input after choosing Rename from the context menu", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onRename={onRename}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("tile-map.png"));
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const input = screen.getByRole("textbox", { name: "Rename map.png" });

    await user.clear(input);
    await user.type(input, "renamed.png{Enter}");

    expect(onRename).toHaveBeenCalledWith(fileEntry, "renamed.png");
  });

  it("cancels renaming on Escape without calling onRename", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onRename={onRename}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("tile-map.png"));
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.type(screen.getByRole("textbox", { name: "Rename map.png" }), "{Escape}");

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });

  it("deletes an entry after confirming from the context menu", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onDelete={onDelete}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("tile-map.png"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDelete).toHaveBeenCalledWith(fileEntry);
  });

  it("does not call onDelete when deletion is cancelled from the context menu", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onDelete={onDelete}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("tile-map.png"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
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

  it("opens the lightbox on double-click of a file tile", () => {
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.doubleClick(screen.getByTestId("tile-map.png"));

    expect(onOpenLightbox).toHaveBeenCalledWith(fileEntry);
  });

  it("does not open the lightbox on double-click of a directory tile", () => {
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [directoryEntry] }]}
      />,
    );
    fireEvent.doubleClick(screen.getByTestId("tile-tiles"));

    expect(onOpenLightbox).not.toHaveBeenCalled();
  });

  it("does not open the lightbox on double-click of the actions menu button", () => {
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.doubleClick(screen.getByRole("button", { name: "Actions for map.png" }));

    expect(onOpenLightbox).not.toHaveBeenCalled();
  });

  it("opens the lightbox via View in the context menu", async () => {
    const user = userEvent.setup();
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryGrid
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.contextMenu(screen.getByTestId("tile-map.png"));
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onOpenLightbox).toHaveBeenCalledWith(fileEntry);
  });
});
