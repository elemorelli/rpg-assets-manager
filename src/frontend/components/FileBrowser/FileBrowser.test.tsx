// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "#frontend/requests/index.ts";
import { FakeEventSource } from "#frontend/testUtils/FakeEventSource.ts";
import { FileBrowser } from "./FileBrowser.tsx";

vi.mock("../../requests/index.ts");

const listDirectoryMock = vi.mocked(api.listDirectory);
const createDirectoryMock = vi.mocked(api.createDirectory);
const deleteEntryMock = vi.mocked(api.deleteEntry);
const renameEntryMock = vi.mocked(api.renameEntry);
const moveEntryMock = vi.mocked(api.moveEntry);
const searchEntriesMock = vi.mocked(api.searchEntries);
const rescanMock = vi.mocked(api.rescan);

describe("FileBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDirectoryMock.mockResolvedValue([
      { name: "tiles", type: "directory" },
      { name: "map.png", type: "file", size: 1024 },
    ]);
    createDirectoryMock.mockResolvedValue(undefined);
    deleteEntryMock.mockResolvedValue(undefined);
    renameEntryMock.mockResolvedValue(undefined);
    moveEntryMock.mockResolvedValue(undefined);
    searchEntriesMock.mockResolvedValue([]);
    rescanMock.mockResolvedValue({ hashed: 0, unchanged: 0, removed: 0 });
    FakeEventSource.reset();
    // @ts-expect-error test double
    globalThis.EventSource = FakeEventSource;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test double
    delete globalThis.EventSource;
  });

  it("lists the root directory on mount", async () => {
    render(<FileBrowser />);

    await screen.findByRole("button", { name: "tiles" });

    expect(listDirectoryMock).toHaveBeenCalledWith("");
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });

  it("navigates into a subdirectory and updates the breadcrumb", async () => {
    const user = userEvent.setup();
    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    listDirectoryMock.mockResolvedValueOnce([{ name: "legacy-pack", type: "directory" }]);
    await user.click(screen.getByRole("button", { name: "tiles" }));

    await screen.findByRole("button", { name: "legacy-pack" });
    expect(listDirectoryMock).toHaveBeenLastCalledWith("tiles");

    const breadcrumbNav = screen.getByRole("navigation");
    expect(within(breadcrumbNav).getByRole("button", { name: "root" })).toBeEnabled();
  });

  it("shows an error message when listing fails", async () => {
    listDirectoryMock.mockReset();
    listDirectoryMock.mockRejectedValue(new Error("network down"));

    render(<FileBrowser />);

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("creates a directory via the toolbar prompt, then refreshes the listing", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("new-folder");

    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    await user.click(screen.getByRole("button", { name: "New folder" }));

    await waitFor(() => {
      expect(createDirectoryMock).toHaveBeenCalledWith("new-folder");
    });
    expect(listDirectoryMock).toHaveBeenCalledTimes(2);
    promptSpy.mockRestore();
  });

  it("deletes an entry after the user confirms", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => {
      expect(deleteEntryMock).toHaveBeenCalledWith("tiles");
    });
    confirmSpy.mockRestore();
  });

  it("does not delete an entry when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(deleteEntryMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("triggers a rescan via the toolbar button", async () => {
    const user = userEvent.setup();
    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    await user.click(screen.getByRole("button", { name: "Rescan" }));

    await waitFor(() => {
      expect(rescanMock).toHaveBeenCalled();
    });
  });

  it("shows search results for a debounced query and hides the directory table", async () => {
    const user = userEvent.setup();
    searchEntriesMock.mockResolvedValue([{ relativePath: "tiles/forest.png", type: "file" }]);

    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    await user.type(screen.getByRole("searchbox"), "forest");

    await screen.findByRole("button", { name: "tiles/forest.png" });
    expect(searchEntriesMock).toHaveBeenCalledWith("forest");
    expect(screen.queryByRole("button", { name: "tiles" })).not.toBeInTheDocument();
  });

  it("navigates to a search result's containing directory and exits search mode", async () => {
    const user = userEvent.setup();
    searchEntriesMock.mockResolvedValue([{ relativePath: "tiles/forest.png", type: "file" }]);

    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    await user.type(screen.getByRole("searchbox"), "forest");
    await user.click(await screen.findByRole("button", { name: "tiles/forest.png" }));

    await waitFor(() => {
      expect(listDirectoryMock).toHaveBeenLastCalledWith("tiles");
    });
    expect(screen.queryByRole("button", { name: "tiles/forest.png" })).not.toBeInTheDocument();
  });

  it("moves an entry when dropped onto a directory row", async () => {
    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    const sourceRow = screen.getByText("map.png").closest("tr");
    const targetRow = screen.getByRole("button", { name: "tiles" }).closest("tr");

    if (!sourceRow || !targetRow) {
      throw new Error("rows not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.dragOver(targetRow);
    fireEvent.drop(targetRow);

    await waitFor(() => {
      expect(moveEntryMock).toHaveBeenCalledWith("map.png", "tiles/map.png");
    });
  });

  it("moves an entry when dropped onto a breadcrumb", async () => {
    const user = userEvent.setup();
    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    listDirectoryMock.mockResolvedValueOnce([{ name: "forest.png", type: "file", size: 512 }]);
    await user.click(screen.getByRole("button", { name: "tiles" }));
    await screen.findByText("forest.png");

    const sourceRow = screen.getByText("forest.png").closest("tr");
    const rootCrumb = screen.getByRole("button", { name: "root" });

    if (!sourceRow) {
      throw new Error("row not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.dragOver(rootCrumb);
    fireEvent.drop(rootCrumb);

    await waitFor(() => {
      expect(moveEntryMock).toHaveBeenCalledWith("tiles/forest.png", "forest.png");
    });
  });

  it("does not move an entry dropped onto its own current directory crumb", async () => {
    render(<FileBrowser />);
    await screen.findByRole("button", { name: "tiles" });

    const sourceRow = screen.getByText("map.png").closest("tr");
    const rootCrumb = screen.getByRole("button", { name: "root" });

    if (!sourceRow) {
      throw new Error("row not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.drop(rootCrumb);

    expect(moveEntryMock).not.toHaveBeenCalled();
  });
});
