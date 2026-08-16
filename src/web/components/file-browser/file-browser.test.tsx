// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";
import { FakeEventSource } from "#web/test-utils/fake-event-source.ts";

import { FileBrowser } from "./file-browser.tsx";

vi.mock("../../requests/index.ts");

const listDirectoryMock = vi.mocked(api.listDirectory);
const createDirectoryMock = vi.mocked(api.createDirectory);
const deleteEntryMock = vi.mocked(api.deleteEntry);
const renameEntryMock = vi.mocked(api.renameEntry);
const moveEntryMock = vi.mocked(api.moveEntry);
const searchEntriesMock = vi.mocked(api.searchEntries);
const rescanMock = vi.mocked(api.rescan);
const fetchSyncRunsMock = vi.mocked(api.fetchSyncRuns);
const fetchTagsMock = vi.mocked(api.fetchTags);
const setAssetTagsMock = vi.mocked(api.setAssetTags);
const fetchFilesByTagMock = vi.mocked(api.fetchFilesByTag);

const renderFileBrowser = (initialPath = "/"): ReturnType<typeof render> =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/*" element={<FileBrowser />} />
      </Routes>
    </MemoryRouter>,
  );

describe("FileBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // Path-conditional, not a blanket mockResolvedValue: FileBrowser now
    // mounts TreeView alongside the table, and TreeView prefetches one level
    // ahead of whatever it loads. A blanket "tiles" result would make the
    // prefetch of "tiles" itself return another "tiles" directory, and so on
    // forever. Only "" (root) has content here; every other path a test
    // doesn't override resolves to empty.
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "tiles", type: "directory" },
              { name: "map.png", type: "file", size: 1024 },
            ]
          : [],
      ),
    );
    createDirectoryMock.mockResolvedValue(undefined);
    deleteEntryMock.mockResolvedValue(undefined);
    renameEntryMock.mockResolvedValue(undefined);
    moveEntryMock.mockResolvedValue(undefined);
    searchEntriesMock.mockResolvedValue([]);
    rescanMock.mockResolvedValue({ hashed: 0, unchanged: 0, removed: 0, renamed: 0 });
    fetchSyncRunsMock.mockResolvedValue([]);
    fetchTagsMock.mockResolvedValue(["npc", "loot"]);
    setAssetTagsMock.mockResolvedValue([]);
    fetchFilesByTagMock.mockResolvedValue([]);
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
    renderFileBrowser();

    // "tiles" now renders twice (once in the tree, once in the table), so
    // this waits on both appearing rather than a role query that would throw
    // on finding more than one match.
    await screen.findAllByText("tiles");

    expect(listDirectoryMock).toHaveBeenCalledWith("");
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });

  it("deep-links directly into a subdirectory from the URL", async () => {
    listDirectoryMock.mockImplementation((path: string) =>
      path === "icons"
        ? Promise.resolve([{ name: "npc.png", type: "file", size: 10 }])
        : Promise.resolve([{ name: "icons", type: "directory" }]),
    );

    renderFileBrowser("/icons");

    await screen.findByText("npc.png");
    expect(listDirectoryMock).toHaveBeenCalledWith("icons");
  });

  it("shows an inline error with a link back to root for an unresolvable deep link", async () => {
    // Path-conditional rather than mockRejectedValueOnce: TreeView's own
    // mount-time load of "" races with FileBrowser's load of "missing", and
    // a plain "reject the next call" would be applied to whichever of those
    // two happens to run first instead of specifically to "missing".
    listDirectoryMock.mockImplementation((path: string) =>
      path === "missing" ? Promise.reject(new Error("not found")) : Promise.resolve([]),
    );

    renderFileBrowser("/missing");

    expect(await screen.findByText("not found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to root" })).toBeInTheDocument();
  });

  it("navigates into a subdirectory and updates the breadcrumb", async () => {
    const user = userEvent.setup();
    renderFileBrowser();
    await screen.findAllByText("tiles");

    listDirectoryMock.mockResolvedValueOnce([{ name: "legacy-pack", type: "directory" }]);
    const nameCell = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!nameCell) {
      throw new Error("tiles name button not found");
    }
    await user.click(nameCell);

    await screen.findAllByText("legacy-pack");
    expect(listDirectoryMock).toHaveBeenLastCalledWith("tiles");

    const breadcrumbNav = screen.getByRole("navigation");
    expect(within(breadcrumbNav).getByRole("button", { name: "root" })).toBeEnabled();
  });

  it("shows an error message when listing fails", async () => {
    listDirectoryMock.mockReset();
    listDirectoryMock.mockRejectedValue(new Error("network down"));

    renderFileBrowser();

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("creates a directory via the toolbar prompt, then refreshes the listing", async () => {
    const user = userEvent.setup();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("new-folder");

    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.click(screen.getByRole("button", { name: "New folder" }));

    await waitFor(() => {
      expect(createDirectoryMock).toHaveBeenCalledWith("new-folder");
    });
    // TreeView independently loads path "" once on mount too, so the total
    // call count for listDirectoryMock isn't just FileBrowser's own 1 (mount)
    // + 1 (post-action refresh); assert the refresh happened by requiring at
    // least a second call for that path, rather than an exact global count.
    await waitFor(() => {
      const rootCallCount = listDirectoryMock.mock.calls.filter(([path]) => path === "").length;

      expect(rootCallCount).toBeGreaterThanOrEqual(2);
    });
    promptSpy.mockRestore();
  });

  it("deletes an entry after the user confirms", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    await waitFor(() => {
      expect(deleteEntryMock).toHaveBeenCalledWith("tiles");
    });
    confirmSpy.mockRestore();
  });

  it("does not delete an entry when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(deleteEntryMock).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("triggers a rescan via the toolbar button", async () => {
    const user = userEvent.setup();
    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.click(screen.getByRole("button", { name: "Rescan" }));

    await waitFor(() => {
      expect(rescanMock).toHaveBeenCalledWith(false);
    });
  });

  it("triggers a full rehash when the toolbar's Full rehash button is toggled on", async () => {
    const user = userEvent.setup();
    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.click(screen.getByRole("button", { name: "Full rehash" }));
    await user.click(screen.getByRole("button", { name: "Rescan" }));

    await waitFor(() => {
      expect(rescanMock).toHaveBeenCalledWith(true);
    });
  });

  it("shows search results for a debounced query and hides the directory table", async () => {
    const user = userEvent.setup();
    searchEntriesMock.mockResolvedValue([{ relativePath: "tiles/forest.png", type: "file" }]);

    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.type(screen.getByRole("searchbox"), "forest");

    await screen.findByRole("button", { name: "tiles/forest.png" });
    expect(searchEntriesMock).toHaveBeenCalledWith("forest");
    expect(screen.queryByText("map.png")).not.toBeInTheDocument();
  });

  it("navigates to a search result's containing directory and exits search mode", async () => {
    const user = userEvent.setup();
    searchEntriesMock.mockResolvedValue([{ relativePath: "tiles/forest.png", type: "file" }]);

    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.type(screen.getByRole("searchbox"), "forest");
    await user.click(await screen.findByRole("button", { name: "tiles/forest.png" }));

    await waitFor(() => {
      expect(listDirectoryMock).toHaveBeenLastCalledWith("tiles");
    });
    expect(screen.queryByRole("button", { name: "tiles/forest.png" })).not.toBeInTheDocument();
  });

  it("moves an entry when dropped onto a directory row", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");

    const sourceRow = screen.getByText("map.png").closest("tr");
    const targetRow = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!sourceRow || !targetRow?.closest("tr")) {
      throw new Error("rows not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.dragOver(targetRow.closest("tr") as HTMLElement);
    fireEvent.drop(targetRow.closest("tr") as HTMLElement);

    await waitFor(() => {
      expect(moveEntryMock).toHaveBeenCalledWith("map.png", "tiles/map.png");
    });
  });

  it("moves an entry when dropped onto a breadcrumb", async () => {
    const user = userEvent.setup();
    renderFileBrowser();
    await screen.findAllByText("tiles");

    listDirectoryMock.mockResolvedValueOnce([{ name: "forest.png", type: "file", size: 512 }]);
    const nameCell = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!nameCell) {
      throw new Error("tiles name button not found");
    }
    await user.click(nameCell);
    await screen.findByText("forest.png");

    const sourceRow = screen.getByText("forest.png").closest("tr");
    // Scoped to the breadcrumb nav: the tree's root node is also named
    // "root", so an unscoped query would match both.
    const rootCrumb = within(screen.getByRole("navigation")).getByRole("button", { name: "root" });

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
    renderFileBrowser();
    await screen.findAllByText("tiles");

    const sourceRow = screen.getByText("map.png").closest("tr");
    // Scoped to the breadcrumb nav: the tree's root node is also named
    // "root", so an unscoped query would match both.
    const rootCrumb = within(screen.getByRole("navigation")).getByRole("button", { name: "root" });

    if (!sourceRow) {
      throw new Error("row not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.drop(rootCrumb);

    expect(moveEntryMock).not.toHaveBeenCalled();
  });

  it("fetches the tag list on mount and renders it as filter chips", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");

    expect(fetchTagsMock).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "npc" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "loot" })).toBeInTheDocument();
  });

  it("shows tag filter results instead of the directory table when a tag chip is clicked", async () => {
    const user = userEvent.setup();
    fetchFilesByTagMock.mockResolvedValue([{ relativePath: "tiles/goblin.png", type: "file" }]);

    renderFileBrowser();
    await screen.findAllByText("tiles");

    await user.click(screen.getByRole("button", { name: "npc" }));

    expect(fetchFilesByTagMock).toHaveBeenCalledWith(["npc"]);
    expect(await screen.findByText("tiles/goblin.png")).toBeInTheDocument();
    expect(screen.queryByText("map.png")).not.toBeInTheDocument();
  });

  it("drags the whole multi-selection when starting a drag from a selected row", async () => {
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "a.png", type: "file", size: 1 },
              { name: "b.png", type: "file", size: 1 },
              { name: "tiles", type: "directory" },
            ]
          : [],
      ),
    );

    renderFileBrowser();
    await screen.findByText("a.png");

    fireEvent.click(screen.getByText("a.png"));
    fireEvent.click(screen.getByText("b.png"), { ctrlKey: true });

    const targetRow = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!targetRow?.closest("tr")) {
      throw new Error("target row not found");
    }

    fireEvent.dragStart(screen.getByText("b.png").closest("tr") as HTMLElement);
    fireEvent.dragOver(targetRow.closest("tr") as HTMLElement);
    fireEvent.drop(targetRow.closest("tr") as HTMLElement);

    await waitFor(() => {
      expect(moveEntryMock).toHaveBeenCalledWith("a.png", "tiles/a.png");
      expect(moveEntryMock).toHaveBeenCalledWith("b.png", "tiles/b.png");
    });
  });

  it("drags only the clicked row when it is outside the current selection", async () => {
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "a.png", type: "file", size: 1 },
              { name: "b.png", type: "file", size: 1 },
              { name: "tiles", type: "directory" },
            ]
          : [],
      ),
    );

    renderFileBrowser();
    await screen.findByText("a.png");

    fireEvent.click(screen.getByText("a.png"));

    const targetRow = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!targetRow?.closest("tr")) {
      throw new Error("target row not found");
    }

    fireEvent.dragStart(screen.getByText("b.png").closest("tr") as HTMLElement);
    fireEvent.dragOver(targetRow.closest("tr") as HTMLElement);
    fireEvent.drop(targetRow.closest("tr") as HTMLElement);

    await waitFor(() => {
      expect(moveEntryMock).toHaveBeenCalledWith("b.png", "tiles/b.png");
    });
    expect(moveEntryMock).not.toHaveBeenCalledWith("a.png", "tiles/a.png");
  });

  it("stops a batch move on the first failure and reports it, without retrying the rest", async () => {
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "a.png", type: "file", size: 1 },
              { name: "b.png", type: "file", size: 1 },
              { name: "tiles", type: "directory" },
            ]
          : [],
      ),
    );
    moveEntryMock.mockImplementation((from: string) =>
      from === "a.png" ? Promise.reject(new Error("locked")) : Promise.resolve(undefined),
    );

    renderFileBrowser();
    await screen.findByText("a.png");

    fireEvent.click(screen.getByText("a.png"));
    fireEvent.click(screen.getByText("b.png"), { ctrlKey: true });

    const targetRow = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!targetRow?.closest("tr")) {
      throw new Error("target row not found");
    }

    fireEvent.dragStart(screen.getByText("a.png").closest("tr") as HTMLElement);
    fireEvent.dragOver(targetRow.closest("tr") as HTMLElement);
    fireEvent.drop(targetRow.closest("tr") as HTMLElement);

    expect(await screen.findByText(/locked/)).toBeInTheDocument();
  });

  it("switches from table to grid rendering when the grid view button is clicked", async () => {
    const user = userEvent.setup();
    renderFileBrowser();

    await screen.findByText("map.png");
    expect(screen.queryByTestId("tile-map.png")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Grid view" }));

    expect(await screen.findByTestId("tile-map.png")).toBeInTheDocument();
  });

  it("keeps the view preference isolated per folder", async () => {
    const user = userEvent.setup();
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [{ name: "map.png", type: "file", size: 1024 }]
          : path === "icons"
            ? [{ name: "sword.png", type: "file", size: 10 }]
            : [],
      ),
    );

    const { unmount } = renderFileBrowser("/");
    await screen.findByText("map.png");
    await user.click(screen.getByRole("button", { name: "Grid view" }));
    await screen.findByTestId("tile-map.png");
    unmount();

    renderFileBrowser("/icons");
    await screen.findByText("sword.png");

    expect(screen.queryByTestId("tile-sword.png")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("restores a previously saved per-folder view preference when the folder is revisited", async () => {
    const user = userEvent.setup();
    const { unmount } = renderFileBrowser();

    await screen.findByText("map.png");
    await user.click(screen.getByRole("button", { name: "Grid view" }));
    await screen.findByTestId("tile-map.png");
    unmount();

    renderFileBrowser();

    expect(await screen.findByTestId("tile-map.png")).toBeInTheDocument();
  });
});
