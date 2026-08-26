// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";
import { __resetAppConfigCacheForTests } from "#web/utils/use-app-config.ts";

import { TreeView } from "./tree-view.tsx";

vi.mock("#web/requests/index.ts");

const getDirectoryTreeMock = vi.mocked(api.getDirectoryTree);
const fetchAppConfigMock = vi.mocked(api.fetchAppConfig);

const DRAG_EXPAND_DELAY_MS = 600;

// The tree loads whole, in one request, so a test's fixture is the full
// children-by-path map the server would return: every directory already
// known up front, not fetched lazily per path.
const mockTree = (childrenByPath: Record<string, DirectoryEntry[]>): void => {
  getDirectoryTreeMock.mockResolvedValue(childrenByPath);
};

const baseProps = {
  activePath: "",
  refreshToken: 0,
  onNavigate: vi.fn(),
  canDropOnPath: () => false,
  onDropEntry: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  availableTags: [] as string[],
  onTagsChange: vi.fn(),
};

describe("TreeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAppConfigCacheForTests();
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: null });
  });

  it("loads and renders the root's subdirectories on mount", async () => {
    mockTree({ "": [{ name: "tiles", type: "directory" }] });

    render(<TreeView {...baseProps} />);

    expect(await screen.findByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(getDirectoryTreeMock).toHaveBeenCalledTimes(1);
  });

  it("shows a skeleton while the tree is loading, then the real nodes", async () => {
    let resolveTree: (childrenByPath: Record<string, DirectoryEntry[]>) => void = () => {};

    getDirectoryTreeMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTree = resolve;
        }),
    );

    render(<TreeView {...baseProps} />);

    expect(screen.getByLabelText("Loading directory tree")).toBeInTheDocument();

    resolveTree({ "": [{ name: "tiles", type: "directory" }] });

    expect(await screen.findByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading directory tree")).not.toBeInTheDocument();
  });

  it("expands a node on toggle click and shows its children", async () => {
    const user = userEvent.setup();
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(<TreeView {...baseProps} />);
    await screen.findByRole("button", { name: "tiles" });

    await user.click(screen.getByRole("button", { name: "Expand tiles" }));

    expect(await screen.findByRole("button", { name: "legacy-pack" })).toBeInTheDocument();
  });

  it("loads the whole tree in a single request, however deep it goes", async () => {
    const user = userEvent.setup();
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
      "tiles/legacy-pack": [{ name: "deep", type: "directory" }],
    });

    render(<TreeView {...baseProps} />);
    await screen.findByRole("button", { name: "tiles" });
    await user.click(screen.getByRole("button", { name: "Expand tiles" }));
    await user.click(screen.getByRole("button", { name: "Expand legacy-pack" }));

    expect(await screen.findByRole("button", { name: "deep" })).toBeInTheDocument();
    expect(getDirectoryTreeMock).toHaveBeenCalledTimes(1);
  });

  it("navigates when a node's name is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    mockTree({ "": [{ name: "tiles", type: "directory" }] });

    render(<TreeView {...baseProps} onNavigate={onNavigate} />);
    await user.click(await screen.findByRole("button", { name: "tiles" }));

    expect(onNavigate).toHaveBeenCalledWith("tiles");
  });

  it("auto-expands and highlights the ancestor chain for the active path", async () => {
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(<TreeView {...baseProps} activePath="tiles/legacy-pack" />);

    const activeNode = await screen.findByRole("button", { name: "legacy-pack" });

    expect(activeNode.closest("li")).toHaveTextContent("legacy-pack");
    expect(activeNode).toHaveAttribute("aria-current", "true");
  });

  it("calls onDropEntry with a node's path when a valid drop lands on it", async () => {
    mockTree({ "": [{ name: "tiles", type: "directory" }] });
    const onDropEntry = vi.fn();

    render(
      <TreeView
        {...baseProps}
        canDropOnPath={(path) => path === "tiles"}
        onDropEntry={onDropEntry}
      />,
    );
    const row = (await screen.findByRole("button", { name: "tiles" })).closest("li");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.dragOver(row);
    fireEvent.drop(row);

    expect(onDropEntry).toHaveBeenCalledWith("tiles");
  });

  it("does not call onDropEntry when canDropOnPath rejects the node", async () => {
    mockTree({ "": [{ name: "tiles", type: "directory" }] });
    const onDropEntry = vi.fn();

    render(<TreeView {...baseProps} onDropEntry={onDropEntry} />);
    const row = (await screen.findByRole("button", { name: "tiles" })).closest("li");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.dragOver(row);
    fireEvent.drop(row);

    expect(onDropEntry).not.toHaveBeenCalled();
  });

  it("shows a retry affordance when the tree fails to load, and retries on click", async () => {
    const user = userEvent.setup();
    getDirectoryTreeMock.mockRejectedValueOnce(new Error("network down"));

    render(<TreeView {...baseProps} />);

    await screen.findByRole("button", { name: "Retry" });
    getDirectoryTreeMock.mockResolvedValueOnce({ "": [{ name: "tiles", type: "directory" }] });

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("button", { name: "tiles" })).toBeInTheDocument();
  });

  it("opens the context menu on right-click", async () => {
    mockTree({ "": [{ name: "tiles", type: "directory" }] });

    render(<TreeView {...baseProps} />);

    // contextmenu bubbles up from the name button through the row div (the
    // handler's owner), not down from the <li> ancestor, so fire it there.
    fireEvent.contextMenu(await screen.findByRole("button", { name: "tiles" }));

    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
  });

  it("opens the context menu via the actions button", async () => {
    const user = userEvent.setup();
    mockTree({ "": [{ name: "tiles", type: "directory" }] });

    render(<TreeView {...baseProps} />);
    await screen.findByRole("button", { name: "tiles" });

    await user.click(screen.getByRole("button", { name: "Actions for tiles" }));

    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
  });

  it("closes the previously open menu when a second node's menu is opened", async () => {
    mockTree({
      "": [
        { name: "tiles", type: "directory" },
        { name: "npc", type: "directory" },
      ],
    });

    render(<TreeView {...baseProps} />);
    const tilesButton = await screen.findByRole("button", { name: "tiles" });
    const npcButton = screen.getByRole("button", { name: "npc" });

    fireEvent.mouseDown(tilesButton);
    fireEvent.contextMenu(tilesButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(npcButton);
    fireEvent.contextMenu(npcButton);

    expect(screen.getAllByRole("menu")).toHaveLength(1);
  });

  it("renames a node via the inline input, calling onRename with the node's path", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(<TreeView {...baseProps} onRename={onRename} />);
    await screen.findByRole("button", { name: "tiles" });
    await user.click(screen.getByRole("button", { name: "Expand tiles" }));

    fireEvent.contextMenu(await screen.findByRole("button", { name: "legacy-pack" }));
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const input = screen.getByRole("textbox", { name: "Rename legacy-pack" });

    await user.clear(input);
    await user.type(input, "old-pack{Enter}");

    expect(onRename).toHaveBeenCalledWith("tiles/legacy-pack", "old-pack");
  });

  it("deletes a node after confirming from the context menu, calling onDelete with the node's path", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    mockTree({ "": [{ name: "tiles", type: "directory" }] });

    render(<TreeView {...baseProps} onDelete={onDelete} />);

    fireEvent.contextMenu(await screen.findByRole("button", { name: "tiles" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onDelete).toHaveBeenCalledWith("tiles");
  });

  it("auto-expands a collapsed droppable node after a sustained drag-hover", async () => {
    const user = userEvent.setup();
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(<TreeView {...baseProps} canDropOnPath={(path) => path === "tiles"} />);
    await screen.findByRole("button", { name: "tiles" });
    await user.click(screen.getByRole("button", { name: "Expand tiles" }));
    await screen.findByRole("button", { name: "legacy-pack" });
    await user.click(screen.getByRole("button", { name: "Collapse tiles" }));

    const row = screen.getByRole("button", { name: "tiles" }).closest("li");

    if (!row) {
      throw new Error("row not found");
    }

    vi.useFakeTimers();
    fireEvent.dragOver(row);

    act(() => {
      vi.advanceTimersByTime(DRAG_EXPAND_DELAY_MS);
    });

    expect(screen.getByRole("button", { name: "legacy-pack" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("cancels the auto-expand timer when the drag leaves before the delay elapses", async () => {
    const user = userEvent.setup();
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(<TreeView {...baseProps} canDropOnPath={(path) => path === "tiles"} />);
    await screen.findByRole("button", { name: "tiles" });
    await user.click(screen.getByRole("button", { name: "Expand tiles" }));
    await screen.findByRole("button", { name: "legacy-pack" });
    await user.click(screen.getByRole("button", { name: "Collapse tiles" }));

    const row = screen.getByRole("button", { name: "tiles" }).closest("li");

    if (!row) {
      throw new Error("row not found");
    }

    vi.useFakeTimers();
    fireEvent.dragOver(row);
    fireEvent.dragLeave(row);

    act(() => {
      vi.advanceTimersByTime(DRAG_EXPAND_DELAY_MS);
    });

    expect(screen.queryByRole("button", { name: "legacy-pack" })).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("refetches the whole tree when refreshToken changes, picking up new pending-sync state", async () => {
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    const { rerender } = render(<TreeView {...baseProps} />);

    await screen.findByRole("button", { name: "tiles" });
    expect(screen.getByRole("button", { name: "tiles" }).className).not.toMatch(/pending/);
    expect(getDirectoryTreeMock).toHaveBeenCalledTimes(1);

    mockTree({
      "": [{ name: "tiles", type: "directory", hasPendingSync: true }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    rerender(<TreeView {...baseProps} refreshToken={1} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "tiles" }).className).toMatch(/pending/);
    });
    expect(getDirectoryTreeMock).toHaveBeenCalledTimes(2);
  });

  it("does not refetch when rerendered with the same refreshToken", async () => {
    mockTree({ "": [{ name: "tiles", type: "directory" }] });

    const { rerender } = render(<TreeView {...baseProps} refreshToken={0} />);

    await screen.findByRole("button", { name: "tiles" });
    getDirectoryTreeMock.mockClear();

    rerender(<TreeView {...baseProps} refreshToken={0} />);

    expect(getDirectoryTreeMock).not.toHaveBeenCalled();
  });
});
