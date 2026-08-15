// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";

import { TreeView } from "./tree-view.tsx";

vi.mock("#web/requests/index.ts");

const listDirectoryMock = vi.mocked(api.listDirectory);

// Every test's tree is finite and explicit per path; any path not listed
// resolves to an empty directory. This keeps the component's one-level
// prefetch from recursing into paths the test never described.
const mockTree = (entriesByPath: Record<string, DirectoryEntry[]>): void => {
  listDirectoryMock.mockImplementation((path: string) =>
    Promise.resolve(entriesByPath[path] ?? []),
  );
};

describe("TreeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders the root's subdirectories on mount, filtering out files", async () => {
    mockTree({
      "": [
        { name: "tiles", type: "directory" },
        { name: "map.png", type: "file", size: 10 },
      ],
    });

    render(
      <TreeView
        activePath=""
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );

    expect(await screen.findByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.queryByText("map.png")).not.toBeInTheDocument();
    expect(listDirectoryMock).toHaveBeenCalledWith("");
  });

  it("expands a node on toggle click and shows its children", async () => {
    const user = userEvent.setup();
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(
      <TreeView
        activePath=""
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );
    await screen.findByRole("button", { name: "tiles" });

    await user.click(screen.getByRole("button", { name: "Expand tiles" }));

    expect(await screen.findByRole("button", { name: "legacy-pack" })).toBeInTheDocument();
  });

  it("prefetches a newly-loaded node's children's children in the background", async () => {
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(
      <TreeView
        activePath=""
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );
    await screen.findByRole("button", { name: "tiles" });

    await waitFor(() => {
      expect(listDirectoryMock).toHaveBeenCalledWith("tiles");
    });
  });

  it("navigates when a node's name is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    mockTree({ "": [{ name: "tiles", type: "directory" }] });

    render(
      <TreeView
        activePath=""
        onNavigate={onNavigate}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "tiles" }));

    expect(onNavigate).toHaveBeenCalledWith("tiles");
  });

  it("auto-expands and highlights the ancestor chain for the active path", async () => {
    mockTree({
      "": [{ name: "tiles", type: "directory" }],
      tiles: [{ name: "legacy-pack", type: "directory" }],
    });

    render(
      <TreeView
        activePath="tiles/legacy-pack"
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );

    const activeNode = await screen.findByRole("button", { name: "legacy-pack" });

    expect(activeNode.closest("li")).toHaveTextContent("legacy-pack");
    expect(activeNode).toHaveAttribute("aria-current", "true");
  });

  it("calls onDropEntry with a node's path when a valid drop lands on it", async () => {
    mockTree({ "": [{ name: "tiles", type: "directory" }] });
    const onDropEntry = vi.fn();

    render(
      <TreeView
        activePath=""
        onNavigate={vi.fn()}
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

    render(
      <TreeView
        activePath=""
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={onDropEntry}
      />,
    );
    const row = (await screen.findByRole("button", { name: "tiles" })).closest("li");

    if (!row) {
      throw new Error("row not found");
    }

    fireEvent.dragOver(row);
    fireEvent.drop(row);

    expect(onDropEntry).not.toHaveBeenCalled();
  });

  it("shows a retry affordance when a node fails to load, and retries on click", async () => {
    const user = userEvent.setup();
    mockTree({});
    listDirectoryMock.mockRejectedValueOnce(new Error("network down"));

    render(
      <TreeView
        activePath=""
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );

    await screen.findByRole("button", { name: "Retry" });
    listDirectoryMock.mockResolvedValueOnce([{ name: "tiles", type: "directory" }]);

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("button", { name: "tiles" })).toBeInTheDocument();
  });
});
