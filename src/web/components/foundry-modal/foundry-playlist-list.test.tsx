// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { FoundryPlaylistList } from "./foundry-playlist-list.tsx";

vi.mock("#web/requests/index.ts");

const fetchFoundryPlaylistTagsMock = vi.mocked(api.fetchFoundryPlaylistTags);
const buildFoundryPlaylistExportUrlMock = vi.mocked(api.buildFoundryPlaylistExportUrl);

describe("FoundryPlaylistList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildFoundryPlaylistExportUrlMock.mockImplementation(
      (tag) => `/api/foundry-worlds/playlists/${encodeURIComponent(tag)}/export`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an empty state when no audio tags exist", async () => {
    fetchFoundryPlaylistTagsMock.mockResolvedValue([]);

    render(<FoundryPlaylistList />);

    expect(await screen.findByText("No audio assets tagged yet.")).toBeInTheDocument();
  });

  it("lists each audio tag with its track count and a download link", async () => {
    fetchFoundryPlaylistTagsMock.mockResolvedValue([{ tag: "storm", count: 3 }]);

    render(<FoundryPlaylistList />);

    expect(await screen.findByText("storm")).toBeInTheDocument();
    expect(screen.getByText("3 tracks")).toBeInTheDocument();
    const downloadLink = screen.getByRole("link", { name: "Download" });
    expect(downloadLink).toHaveAttribute("href", "/api/foundry-worlds/playlists/storm/export");
  });

  it("uses the singular form for a single track", async () => {
    fetchFoundryPlaylistTagsMock.mockResolvedValue([{ tag: "ambience", count: 1 }]);

    render(<FoundryPlaylistList />);

    expect(await screen.findByText("1 track")).toBeInTheDocument();
  });

  it("shows an error message when fetching tags fails", async () => {
    fetchFoundryPlaylistTagsMock.mockRejectedValue(new Error("network down"));

    render(<FoundryPlaylistList />);

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });
});
