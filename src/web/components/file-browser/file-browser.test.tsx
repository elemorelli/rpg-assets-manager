// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "#web/requests/http-client.ts";
import * as api from "#web/requests/index.ts";
import { FakeEventSource } from "#web/test-utils/fake-event-source.ts";

import { FileBrowser } from "./file-browser.tsx";

vi.mock("../../requests/index.ts");

const CONFLICT_STATUS = 409;

const listDirectoryMock = vi.mocked(api.listDirectory);
const createDirectoryMock = vi.mocked(api.createDirectory);
const deleteEntryMock = vi.mocked(api.deleteEntry);
const renameEntryMock = vi.mocked(api.renameEntry);
const moveEntryMock = vi.mocked(api.moveEntry);
const uploadFileMock = vi.mocked(api.uploadFile);
const searchEntriesMock = vi.mocked(api.searchEntries);
const rescanMock = vi.mocked(api.rescan);
const fetchFoundryWorldsMock = vi.mocked(api.fetchFoundryWorlds);
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
    uploadFileMock.mockResolvedValue(undefined);
    searchEntriesMock.mockResolvedValue([]);
    rescanMock.mockResolvedValue({ hashed: 0, unchanged: 0, removed: 0, renamed: 0 });
    fetchFoundryWorldsMock.mockResolvedValue([]);
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
    expect(within(breadcrumbNav).getByRole("button", { name: "tiles" })).toBeDisabled();
    expect(within(breadcrumbNav).queryByRole("button", { name: "root" })).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Folder actions" }));
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

  it("deletes an entry after confirming from the context menu", async () => {
    const user = userEvent.setup();

    renderFileBrowser();
    await screen.findAllByText("tiles");

    const table = screen.getByRole("table");

    await user.click(within(table).getByRole("button", { name: "Actions for tiles" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(deleteEntryMock).toHaveBeenCalledWith("tiles");
    });
  });

  it("opens the folder actions menu when right-clicking empty space in the file list", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");

    fireEvent.contextMenu(screen.getByTestId("directory-dropzone"));

    expect(screen.getByRole("button", { name: "New folder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert" })).toBeInTheDocument();
  });

  it("does not open the folder actions menu when right-clicking a row", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");

    const row = screen.getByText("map.png").closest("tr");

    if (!row) {
      throw new Error("map.png row not found");
    }

    fireEvent.contextMenu(row);

    expect(screen.queryByRole("button", { name: "New folder" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
  });

  it("does not delete an entry when the user cancels the confirmation", async () => {
    const user = userEvent.setup();

    renderFileBrowser();
    await screen.findAllByText("tiles");

    const table = screen.getByRole("table");

    await user.click(within(table).getByRole("button", { name: "Actions for tiles" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteEntryMock).not.toHaveBeenCalled();
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
    // Path-conditional rather than mockResolvedValueOnce: TreeView eagerly
    // prefetches subdirectories in the background, so a queued "once" value
    // can be consumed by that prefetch instead of the click this test drives.
    listDirectoryMock.mockImplementation((path: string) => {
      if (path === "") {
        return Promise.resolve([
          { name: "tiles", type: "directory" },
          { name: "map.png", type: "file", size: 1024 },
        ]);
      }
      if (path === "tiles") {
        return Promise.resolve([{ name: "legacy-pack", type: "directory" }]);
      }
      if (path === "tiles/legacy-pack") {
        return Promise.resolve([{ name: "forest.png", type: "file", size: 512 }]);
      }
      return Promise.resolve([]);
    });
    renderFileBrowser();
    await screen.findAllByText("tiles");

    const tilesCell = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!tilesCell) {
      throw new Error("tiles name button not found");
    }
    await user.click(tilesCell);
    await screen.findAllByText("legacy-pack");

    const legacyPackCell = screen.getAllByText("legacy-pack").find((el) => el.closest("tr") !== null);

    if (!legacyPackCell) {
      throw new Error("legacy-pack name button not found");
    }
    await user.click(legacyPackCell);
    await screen.findByText("forest.png");

    const sourceRow = screen.getByText("forest.png").closest("tr");
    const tilesCrumb = within(screen.getByRole("navigation")).getByRole("button", { name: "tiles" });

    if (!sourceRow) {
      throw new Error("row not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.dragOver(tilesCrumb);
    fireEvent.drop(tilesCrumb);

    await waitFor(() => {
      expect(moveEntryMock).toHaveBeenCalledWith("tiles/legacy-pack/forest.png", "tiles/forest.png");
    });
  });

  it("does not move an entry dropped onto its own current directory crumb", async () => {
    const user = userEvent.setup();
    renderFileBrowser();
    await screen.findAllByText("tiles");

    listDirectoryMock.mockResolvedValueOnce([{ name: "forest.png", type: "file", size: 512 }]);
    const tilesCell = screen.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!tilesCell) {
      throw new Error("tiles name button not found");
    }
    await user.click(tilesCell);
    await screen.findByText("forest.png");

    const sourceRow = screen.getByText("forest.png").closest("tr");
    const tilesCrumb = within(screen.getByRole("navigation")).getByRole("button", { name: "tiles" });

    if (!sourceRow) {
      throw new Error("row not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.drop(tilesCrumb);

    expect(moveEntryMock).not.toHaveBeenCalled();
  });

  it("shows a dropzone overlay while an external file is dragged over, and hides it on leave", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");

    const dropzone = screen.getByTestId("directory-dropzone");

    fireEvent.dragEnter(dropzone, { dataTransfer: { types: ["Files"] } });
    expect(screen.getByText("Drop files to upload to root")).toBeInTheDocument();

    fireEvent.dragLeave(dropzone, { dataTransfer: { types: ["Files"] } });
    expect(screen.queryByText("Drop files to upload to root")).not.toBeInTheDocument();
  });

  it("ignores an internal row drag as an external file drop", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");
    const sourceRow = screen.getByText("map.png").closest("tr");

    if (!sourceRow) {
      throw new Error("row not found");
    }

    fireEvent.dragStart(sourceRow);
    fireEvent.dragEnter(screen.getByTestId("directory-dropzone"), {
      dataTransfer: { types: ["text/plain"] },
    });

    expect(screen.queryByText(/Drop files to upload/)).not.toBeInTheDocument();
  });

  it("uploads files dropped from outside the browser to the current directory", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");

    const file = new File(["content"], "new-map.png", { type: "image/png" });
    const dropzone = screen.getByTestId("directory-dropzone");

    fireEvent.dragEnter(dropzone, { dataTransfer: { types: ["Files"] } });
    fireEvent.drop(dropzone, { dataTransfer: { types: ["Files"], files: [file] } });

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledWith("", file);
    });
    expect(screen.queryByText(/Drop files to upload/)).not.toBeInTheDocument();
  });

  it("uploads files inside a dropped folder to the matching subdirectory", async () => {
    renderFileBrowser();
    await screen.findAllByText("tiles");

    const file = new File(["content"], "hello.mp3", { type: "audio/mpeg" });
    const fileEntry = {
      isFile: true,
      isDirectory: false,
      name: "hello.mp3",
      fullPath: "/audio/hello.mp3",
      file: (success: (resolvedFile: File) => void) => success(file),
    };
    let remainingEntries: unknown[] = [fileEntry];
    const folderEntry = {
      isFile: false,
      isDirectory: true,
      name: "audio",
      fullPath: "/audio",
      createReader: () => ({
        readEntries: (success: (entries: unknown[]) => void) => {
          const batch = remainingEntries;

          remainingEntries = [];
          success(batch);
        },
      }),
    };

    fireEvent.drop(screen.getByTestId("directory-dropzone"), {
      dataTransfer: { types: ["Files"], items: [{ webkitGetAsEntry: () => folderEntry }] },
    });

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledWith("audio", file);
    });
  });

  it("stops uploading dropped files on the first failure and reports how many succeeded", async () => {
    const fileA = new File(["a"], "a.png", { type: "image/png" });
    const fileB = new File(["b"], "b.png", { type: "image/png" });
    uploadFileMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("disk full"));
    renderFileBrowser();
    await screen.findAllByText("tiles");

    fireEvent.drop(screen.getByTestId("directory-dropzone"), {
      dataTransfer: { types: ["Files"], files: [fileA, fileB] },
    });

    expect(
      await screen.findByText('Uploaded 1 of 2 before failing on "b.png": disk full'),
    ).toBeInTheDocument();
  });

  it("prompts to overwrite on a name conflict and retries the upload on confirm", async () => {
    const file = new File(["content"], "existing.png", { type: "image/png" });
    uploadFileMock
      .mockRejectedValueOnce(new ApiError("File already exists", CONFLICT_STATUS))
      .mockResolvedValueOnce(undefined);
    renderFileBrowser();
    await screen.findAllByText("tiles");

    fireEvent.drop(screen.getByTestId("directory-dropzone"), {
      dataTransfer: { types: ["Files"], files: [file] },
    });

    expect(await screen.findByText("existing.png")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Overwrite" }));

    await waitFor(() => {
      expect(uploadFileMock).toHaveBeenCalledWith("", file, true);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves the existing file untouched when the overwrite prompt is cancelled", async () => {
    const file = new File(["content"], "existing.png", { type: "image/png" });
    uploadFileMock.mockRejectedValueOnce(new ApiError("File already exists", CONFLICT_STATUS));
    renderFileBrowser();
    await screen.findAllByText("tiles");

    fireEvent.drop(screen.getByTestId("directory-dropzone"), {
      dataTransfer: { types: ["Files"], files: [file] },
    });

    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(
      await screen.findByText("Skipped 1 file(s) that already exist: existing.png"),
    ).toBeInTheDocument();
    expect(uploadFileMock).toHaveBeenCalledTimes(1);
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

    const table = within(screen.getByRole("table"));

    fireEvent.click(table.getByText("a.png"));
    fireEvent.click(table.getByText("b.png"), { ctrlKey: true });

    const targetRow = table.getAllByText("tiles").find((el) => el.closest("tr") !== null);

    if (!targetRow?.closest("tr")) {
      throw new Error("target row not found");
    }

    fireEvent.dragStart(table.getByText("a.png").closest("tr") as HTMLElement);
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

  it("sorts the table by clicking the Name column header, toggling direction on repeated clicks", async () => {
    const user = userEvent.setup();
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "b.png", type: "file", size: 10 },
              { name: "a.png", type: "file", size: 20 },
            ]
          : [],
      ),
    );

    renderFileBrowser();
    await screen.findByText("a.png");

    const table = screen.getByRole("table");
    const namesInOrder = (): string[] =>
      within(table)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getByText(/\.png$/).textContent ?? "");

    expect(namesInOrder()).toEqual(["a.png", "b.png"]);

    await user.click(within(table).getByRole("button", { name: "Name" }));

    expect(namesInOrder()).toEqual(["b.png", "a.png"]);
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

  it("opens the lightbox when the small preview image is clicked", async () => {
    const user = userEvent.setup();

    renderFileBrowser();
    await screen.findByText("map.png");
    await user.click(screen.getByRole("button", { name: "map.png" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens the lightbox on click of a table row", async () => {
    renderFileBrowser();
    await screen.findByText("map.png");

    const row = screen.getByText("map.png").closest("tr");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.click(row);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not open the lightbox on click of a directory row", async () => {
    renderFileBrowser();
    await screen.findByText("map.png");

    const row = within(screen.getByRole("table")).getByText("tiles").closest("tr");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.click(row);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates into a directory on click of its row", async () => {
    renderFileBrowser();
    await screen.findByText("map.png");

    listDirectoryMock.mockResolvedValueOnce([{ name: "legacy-pack", type: "directory" }]);
    const row = within(screen.getByRole("table")).getByText("tiles").closest("tr");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.click(row);

    await screen.findAllByText("legacy-pack");
    expect(listDirectoryMock).toHaveBeenLastCalledWith("tiles");
  });

  it("steps to the next previewable entry and disables Next at the end", async () => {
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "a.png", type: "file", size: 10 },
              { name: "b.wav", type: "file", size: 10 },
            ]
          : [],
      ),
    );

    const user = userEvent.setup();
    renderFileBrowser();
    await screen.findByText("a.png");

    await user.click(screen.getByRole("button", { name: "a.png" }));
    expect(screen.getByRole("img", { name: "a.png" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(document.querySelector("audio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("advances to the next previewable entry after deleting the current one", async () => {
    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "a.png", type: "file", size: 10 },
              { name: "b.png", type: "file", size: 10 },
            ]
          : [],
      ),
    );

    const user = userEvent.setup();
    renderFileBrowser();
    await screen.findByText("a.png");

    await user.click(screen.getByRole("button", { name: "a.png" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("img", { name: "b.png" })).toBeInTheDocument();
    expect(deleteEntryMock).toHaveBeenCalledWith("a.png");
  });

  it("keeps the lightbox open on the renamed entry", async () => {
    const user = userEvent.setup();
    let currentFileName = "map.png";

    listDirectoryMock.mockImplementation((path: string) =>
      Promise.resolve(
        path === ""
          ? [
              { name: "tiles", type: "directory" },
              { name: currentFileName, type: "file", size: 1024 },
            ]
          : [],
      ),
    );
    renameEntryMock.mockImplementation(async (_path: string, newName: string) => {
      currentFileName = newName;
    });

    renderFileBrowser();
    await screen.findByText("map.png");

    await user.click(screen.getByRole("button", { name: "map.png" }));
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const input = screen.getByLabelText("Rename map.png");

    await user.clear(input);
    await user.type(input, "castle.png{Enter}");

    expect(renameEntryMock).toHaveBeenCalledWith("map.png", "castle.png");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
