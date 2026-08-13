// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DirectoryEntry } from "../../../core/directoryListing.ts";
import { DirectoryTable } from "./DirectoryTable.tsx";

const directoryEntry: DirectoryEntry = { name: "tiles", type: "directory" };
const fileEntry: DirectoryEntry = { name: "map.png", type: "file", size: 2048 };

describe("DirectoryTable", () => {
  it("renders a name button for directories and plain text for files", () => {
    render(
      <DirectoryTable
        entries={[directoryEntry, fileEntry]}
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
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
        onOpenDirectory={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
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
        onOpenDirectory={onOpenDirectory}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onMove={vi.fn()}
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
        onOpenDirectory={vi.fn()}
        onRename={onRename}
        onDelete={onDelete}
        onMove={onMove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.click(screen.getByRole("button", { name: "Move" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onRename).toHaveBeenCalledWith(fileEntry);
    expect(onMove).toHaveBeenCalledWith(fileEntry);
    expect(onDelete).toHaveBeenCalledWith(fileEntry);
  });
});
