// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { SyncModal } from "./sync-modal.tsx";

vi.mock("#web/requests/index.ts");

const fetchDiffMock = vi.mocked(api.fetchDiff);
const applyBatchMock = vi.mocked(api.applyBatch);

describe("SyncModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the diff as soon as it opens", () => {
    fetchDiffMock.mockResolvedValue({
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });

    render(<SyncModal currentPath="tiles" onClose={vi.fn()} onApplied={vi.fn()} />);

    expect(fetchDiffMock).toHaveBeenCalledWith("tiles", "folder");
  });

  it("refetches the diff for the newly selected scope when it changes", async () => {
    const user = userEvent.setup();
    fetchDiffMock.mockResolvedValue({
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });

    render(<SyncModal currentPath="tiles" onClose={vi.fn()} onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "All folders" }));

    expect(fetchDiffMock).toHaveBeenLastCalledWith("tiles", "all");
  });

  it("shows colored counts, the change list, and ambiguous warnings once the diff resolves", async () => {
    fetchDiffMock.mockResolvedValue({
      added: ["a.png"],
      modified: ["b.png"],
      deleted: ["c.png", "d.png"],
      renamed: [{ oldPath: "old.png", newPath: "new.png" }],
      ambiguousWarnings: [{ hash: "h1", localPaths: ["x.png"], remotePaths: ["y.png"] }],
    });

    render(<SyncModal currentPath="tiles" onClose={vi.fn()} onApplied={vi.fn()} />);

    expect(await screen.findByText("1 added")).toBeInTheDocument();
    expect(screen.getByText("1 modified")).toBeInTheDocument();
    expect(screen.getByText("2 deleted")).toBeInTheDocument();
    expect(screen.getByText("1 renamed")).toBeInTheDocument();
    expect(screen.getByText("a.png")).toBeInTheDocument();
    expect(screen.getAllByText("b.png")).toHaveLength(2);
    expect(screen.getByText("old.png")).toBeInTheDocument();
    expect(screen.getByText("new.png")).toBeInTheDocument();
    expect(screen.getByText("c.png")).toBeInTheDocument();
    expect(screen.getByText("d.png")).toBeInTheDocument();
    expect(screen.getByText("x.png <-> y.png")).toBeInTheDocument();
  });

  it("shows a message when there is nothing to sync", async () => {
    fetchDiffMock.mockResolvedValue({
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });

    render(<SyncModal currentPath="tiles" onClose={vi.fn()} onApplied={vi.fn()} />);

    expect(await screen.findByText("Nothing to sync.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply changes" })).not.toBeInTheDocument();
  });

  it("applies, then notifies the parent and closes", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    const onClose = vi.fn();
    fetchDiffMock.mockResolvedValue({
      added: ["a.png"],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });
    applyBatchMock.mockResolvedValue({
      added: 1,
      modified: 0,
      deleted: 0,
      renamed: 0,
      outcome: "applied",
      syncRunId: 1,
    });

    render(<SyncModal currentPath="tiles" onClose={onClose} onApplied={onApplied} />);
    await screen.findByText("1 added");
    await user.click(screen.getByRole("button", { name: "Apply changes" }));

    await waitFor(() => {
      expect(applyBatchMock).toHaveBeenCalledWith("tiles", "folder");
    });
    expect(onApplied).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without applying when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchDiffMock.mockResolvedValue({
      added: ["a.png"],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });

    render(<SyncModal currentPath="tiles" onClose={onClose} onApplied={vi.fn()} />);
    await screen.findByText("1 added");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(applyBatchMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error and stays open when applying fails", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchDiffMock.mockResolvedValue({
      added: ["a.png"],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });
    applyBatchMock.mockRejectedValue(new Error("disk full"));

    render(<SyncModal currentPath="tiles" onClose={onClose} onApplied={vi.fn()} />);
    await screen.findByText("1 added");
    await user.click(screen.getByRole("button", { name: "Apply changes" }));

    expect(await screen.findByText("disk full")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
