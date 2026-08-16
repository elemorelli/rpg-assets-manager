// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { DirectoryTable } from "./directory-table.tsx";

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

const getRow = (text: string): HTMLElement => {
  const row = screen.getByText(text).closest("tr");

  if (!row) {
    throw new Error(`row for "${text}" not found`);
  }

  return row;
};

describe("DirectoryTable", () => {
  it("renders a name button for directories and plain text for files", () => {
    render(
      <DirectoryTable
        {...baseProps}
        groups={[{ label: null, entries: [directoryEntry, fileEntry] }]}
      />,
    );

    expect(screen.getByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.getByText("map.png").tagName).not.toBe("BUTTON");
  });

  it("shows the formatted size for files, and nothing for directories", () => {
    render(
      <DirectoryTable
        {...baseProps}
        groups={[{ label: null, entries: [directoryEntry, fileEntry] }]}
      />,
    );

    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("opens a directory on click", async () => {
    const user = userEvent.setup();
    const onOpenDirectory = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onOpenDirectory={onOpenDirectory}
        groups={[{ label: null, entries: [directoryEntry] }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "tiles" }));

    expect(onOpenDirectory).toHaveBeenCalledWith("tiles");
  });

  it("calls onDragStart with the source entry, and onDragEnd when the drag ends", () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    const row = getRow("map.png");

    fireEvent.dragStart(row);
    expect(onDragStart).toHaveBeenCalledWith(fileEntry);

    fireEvent.dragEnd(row);
    expect(onDragEnd).toHaveBeenCalled();
  });

  it("calls onDropEntry when a row canDropEntry approves receives a drop", () => {
    const onDropEntry = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        canDropEntry={() => true}
        onDropEntry={onDropEntry}
        groups={[{ label: null, entries: [directoryEntry] }]}
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
        {...baseProps}
        onDropEntry={onDropEntry}
        groups={[{ label: null, entries: [directoryEntry] }]}
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
    render(<DirectoryTable {...baseProps} groups={[{ label: null, entries: [fileEntry] }]} />);

    expect(screen.getByRole("button", { name: "map.png" })).toHaveAttribute(
      "src",
      "/api/files/raw?path=tiles%2Fmap.png",
    );
  });

  it("renders read-only tag badges for file rows", () => {
    const taggedFile: DirectoryEntry = { name: "npc.png", type: "file", size: 10, tags: ["npc"] };

    render(<DirectoryTable {...baseProps} groups={[{ label: null, entries: [taggedFile] }]} />);

    expect(screen.getByText("npc")).toBeInTheDocument();
    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });

  it("does not render tag badges for directory rows", () => {
    render(<DirectoryTable {...baseProps} groups={[{ label: null, entries: [directoryEntry] }]} />);

    expect(screen.queryByLabelText("Add tag")).not.toBeInTheDocument();
  });

  it("allows editing tags through the context menu for file rows", async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();
    const taggedFile: DirectoryEntry = { name: "npc.png", type: "file", size: 10, tags: ["npc"] };

    render(
      <DirectoryTable
        {...baseProps}
        availableTags={["npc", "loot"]}
        onTagsChange={onTagsChange}
        groups={[{ label: null, entries: [taggedFile] }]}
      />,
    );

    fireEvent.contextMenu(getRow("npc.png"));
    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(taggedFile, ["npc", "loot"]);
  });

  it("highlights a row that is in the selected set", () => {
    render(
      <DirectoryTable
        {...baseProps}
        selectedNames={new Set(["map.png"])}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    expect(screen.getByText("map.png").closest("tr")).toHaveAttribute("aria-selected", "true");
  });

  it("calls onSelectRow with a replace modifier on a plain click", async () => {
    const user = userEvent.setup();
    const onSelectRow = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    await user.click(screen.getByText("map.png"));

    expect(onSelectRow).toHaveBeenCalledWith(fileEntry, "replace");
  });

  it("calls onSelectRow with a toggle modifier on ctrl+click", () => {
    const onSelectRow = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.click(screen.getByText("map.png"), { ctrlKey: true });

    expect(onSelectRow).toHaveBeenCalledWith(fileEntry, "toggle");
  });

  it("calls onSelectRow with a range modifier on shift+click", () => {
    const onSelectRow = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.click(screen.getByText("map.png"), { shiftKey: true });

    expect(onSelectRow).toHaveBeenCalledWith(fileEntry, "range");
  });

  it("opens the directory on a name click without also calling onSelectRow", async () => {
    const user = userEvent.setup();
    const onOpenDirectory = vi.fn();
    const onSelectRow = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onOpenDirectory={onOpenDirectory}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [directoryEntry] }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "tiles" }));

    expect(onOpenDirectory).toHaveBeenCalledWith("tiles");
    expect(onSelectRow).not.toHaveBeenCalled();
  });

  it("opens the context menu on right-click without also calling onSelectRow", () => {
    const onSelectRow = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onSelectRow={onSelectRow}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.contextMenu(getRow("map.png"));

    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(onSelectRow).not.toHaveBeenCalled();
  });

  it("opens the context menu via the actions button without also calling onSelectRow", async () => {
    const user = userEvent.setup();
    const onSelectRow = vi.fn();

    render(
      <DirectoryTable
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
      <DirectoryTable
        {...baseProps}
        groups={[{ label: null, entries: [directoryEntry, fileEntry] }]}
      />,
    );
    const directoryRow = screen.getByRole("button", { name: "tiles" }).closest("tr");
    const fileRow = getRow("map.png");

    if (!directoryRow) {
      throw new Error("row not found");
    }

    fireEvent.mouseDown(directoryRow);
    fireEvent.contextMenu(directoryRow);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(fileRow);
    fireEvent.contextMenu(fileRow);

    expect(screen.getAllByRole("menu")).toHaveLength(1);
  });

  it("renames an entry via the inline input after choosing Rename from the context menu", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onRename={onRename}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(getRow("map.png"));
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
      <DirectoryTable
        {...baseProps}
        onRename={onRename}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(getRow("map.png"));
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.type(screen.getByRole("textbox", { name: "Rename map.png" }), "{Escape}");

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });

  it("deletes an entry after confirming from the context menu", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onDelete={onDelete}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(getRow("map.png"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDelete).toHaveBeenCalledWith(fileEntry);
  });

  it("does not call onDelete when deletion is cancelled from the context menu", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onDelete={onDelete}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );

    fireEvent.contextMenu(getRow("map.png"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("renders a header row for each labeled group, in the given order", () => {
    render(
      <DirectoryTable
        {...baseProps}
        groups={[
          { label: "Folders", entries: [directoryEntry] },
          { label: "npc", entries: [fileEntry] },
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Folders" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "npc" })).toBeInTheDocument();
  });

  it("renders no header row when the group label is null", () => {
    render(<DirectoryTable {...baseProps} groups={[{ label: null, entries: [fileEntry] }]} />);

    expect(screen.queryAllByRole("columnheader").map((header) => header.textContent)).not.toContain(
      null,
    );
  });

  it("opens the lightbox when the small preview image is clicked", async () => {
    const user = userEvent.setup();
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "map.png" }));

    expect(onOpenLightbox).toHaveBeenCalledWith(fileEntry);
  });

  it("opens the lightbox on double-click of a file row", () => {
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.doubleClick(getRow("map.png"));

    expect(onOpenLightbox).toHaveBeenCalledWith(fileEntry);
  });

  it("does not open the lightbox on double-click of a directory row", () => {
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryTable
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [directoryEntry] }]}
      />,
    );
    fireEvent.doubleClick(
      screen.getByRole("button", { name: "tiles" }).closest("tr") as HTMLElement,
    );

    expect(onOpenLightbox).not.toHaveBeenCalled();
  });

  it("does not open the lightbox on double-click of the actions menu button", () => {
    const onOpenLightbox = vi.fn();

    render(
      <DirectoryTable
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
      <DirectoryTable
        {...baseProps}
        onOpenLightbox={onOpenLightbox}
        groups={[{ label: null, entries: [fileEntry] }]}
      />,
    );
    fireEvent.contextMenu(getRow("map.png"));
    await user.click(screen.getByRole("button", { name: "View" }));

    expect(onOpenLightbox).toHaveBeenCalledWith(fileEntry);
  });
});
