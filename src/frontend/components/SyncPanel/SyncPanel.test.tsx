// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../requests/index.ts";
import { SyncPanel } from "./SyncPanel.tsx";

vi.mock("../../requests/index.ts");

const fetchDiffMock = vi.mocked(api.fetchDiff);
const applyBatchMock = vi.mocked(api.applyBatch);

describe("SyncPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not fetch a diff until the user asks for one", () => {
    render(<SyncPanel onApplied={vi.fn()} />);

    expect(fetchDiffMock).not.toHaveBeenCalled();
  });

  it("shows counts, full deletions, and ambiguous warnings after checking", async () => {
    const user = userEvent.setup();
    fetchDiffMock.mockResolvedValue({
      added: ["a.png"],
      modified: ["b.png"],
      deleted: ["c.png", "d.png"],
      renamed: [],
      ambiguousWarnings: [{ hash: "h1", localPaths: ["x.png"], remotePaths: ["y.png"] }],
    });

    render(<SyncPanel onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Check for changes" }));

    expect(
      await screen.findByText("1 added, 1 modified, 2 deleted, 0 renamed"),
    ).toBeInTheDocument();
    expect(screen.getByText("c.png")).toBeInTheDocument();
    expect(screen.getByText("d.png")).toBeInTheDocument();
    expect(screen.getByText("x.png <-> y.png")).toBeInTheDocument();
  });

  it("shows a message when there is nothing to sync", async () => {
    const user = userEvent.setup();
    fetchDiffMock.mockResolvedValue({
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });

    render(<SyncPanel onApplied={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Check for changes" }));

    expect(await screen.findByText("Nothing to sync.")).toBeInTheDocument();
  });

  it("applies and notifies the parent on success", async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
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

    render(<SyncPanel onApplied={onApplied} />);
    await user.click(screen.getByRole("button", { name: "Check for changes" }));
    await screen.findByText("1 added, 0 modified, 0 deleted, 0 renamed");
    await user.click(screen.getByRole("button", { name: "Apply changes" }));

    await waitFor(() => {
      expect(applyBatchMock).toHaveBeenCalled();
    });
    expect(onApplied).toHaveBeenCalled();
    expect(screen.queryByText("1 added, 0 modified, 0 deleted, 0 renamed")).not.toBeInTheDocument();
  });
});
