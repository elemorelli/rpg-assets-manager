// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";

import { LightboxDetails } from "./lightbox-details.tsx";

vi.mock("#web/requests/index.ts");

const fetchAppConfigMock = vi.mocked(api.fetchAppConfig);

const entry: DirectoryEntry = {
  name: "map.png",
  type: "file",
  size: 2048,
  mtimeMs: 1750000000000,
  tags: ["npc"],
};

const baseProps = {
  entry,
  relativePath: "handouts/map.png",
  onRename: vi.fn(),
  onDelete: vi.fn(),
  availableTags: ["npc", "loot"],
  onTagsChange: vi.fn(),
};

describe("LightboxDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders type, size, and modified date", () => {
    render(<LightboxDetails {...baseProps} entry={entry} />);

    expect(screen.getByText("file")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(
      screen.getByText(new Date(entry.mtimeMs as number).toLocaleString()),
    ).toBeInTheDocument();
  });

  it("omits size and modified fields when not present on the entry", () => {
    render(<LightboxDetails {...baseProps} entry={{ name: "map.png", type: "file", tags: [] }} />);

    expect(screen.queryByText("Size")).not.toBeInTheDocument();
    expect(screen.queryByText("Modified")).not.toBeInTheDocument();
  });

  it("renames on Enter", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onRename={onRename} />);
    await user.click(screen.getByRole("button", { name: "Rename" }));

    const input = screen.getByLabelText("Rename map.png");
    await user.clear(input);
    await user.type(input, "castle.png{Enter}");

    expect(onRename).toHaveBeenCalledWith(entry, "castle.png");
  });

  it("cancels renaming on Escape without calling onRename", async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onRename={onRename} />);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.type(screen.getByLabelText("Rename map.png"), "{Escape}");

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });

  it("shows a delete confirmation before calling onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText('Delete "map.png"?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onDelete).toHaveBeenCalledWith(entry);
  });

  it("labels the tags section", () => {
    render(<LightboxDetails {...baseProps} entry={entry} />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("forwards tag changes via TagEditor", async () => {
    const user = userEvent.setup();
    const onTagsChange = vi.fn();

    render(<LightboxDetails {...baseProps} entry={entry} onTagsChange={onTagsChange} />);
    await user.type(screen.getByLabelText("Add tag"), "loot{Enter}");

    expect(onTagsChange).toHaveBeenCalledWith(entry, ["npc", "loot"]);
  });

  it("does not show public link actions when no public base url is configured", async () => {
    render(<LightboxDetails {...baseProps} />);

    await screen.findByText("map.png");

    expect(screen.queryByRole("link", { name: "Open" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
  });

  it("links to the public asset url when a base url is configured", async () => {
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: "https://assets.elemorelli.com" });

    render(<LightboxDetails {...baseProps} />);

    const link = await screen.findByRole("link", { name: "Open" });

    expect(link).toHaveAttribute("href", "https://assets.elemorelli.com/handouts/map.png");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("copies the public asset url to the clipboard and shows temporary feedback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: "https://assets.elemorelli.com" });

    render(<LightboxDetails {...baseProps} />);
    await screen.findByRole("button", { name: "Copy" });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(writeTextMock).toHaveBeenCalledWith("https://assets.elemorelli.com/handouts/map.png");
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    const COPY_FEEDBACK_DURATION_MS = 1500;

    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_DURATION_MS);
    });

    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
