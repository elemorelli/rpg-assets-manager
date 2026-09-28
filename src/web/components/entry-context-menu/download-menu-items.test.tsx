// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";
import { triggerDownload, triggerDownloads } from "#web/utils/trigger-download.ts";

import { DownloadMenuItems, type DownloadMenuItemsProps } from "./download-menu-items.tsx";

vi.mock("#web/requests/index.ts");
vi.mock("#web/utils/trigger-download.ts");

const fileEntry: DirectoryEntry = { name: "map.png", type: "file" };
const otherFileEntry: DirectoryEntry = { name: "portrait.png", type: "file" };
const directoryEntry: DirectoryEntry = { name: "tiles", type: "directory" };

const renderDownloadItems = (
  props: Pick<DownloadMenuItemsProps, "selectedEntries"> & Partial<DownloadMenuItemsProps>,
): void => {
  render(<DownloadMenuItems relativePath="handouts/map.png" onClose={vi.fn()} {...props} />);
};

describe("DownloadMenuItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.buildFileDownloadUrl).mockImplementation((path) => `file:${path}`);
    vi.mocked(api.buildZipDownloadUrl).mockImplementation((paths) => `zip:${paths.join(",")}`);
  });

  it("downloads a single file directly and closes the menu", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderDownloadItems({ selectedEntries: [fileEntry], onClose });
    await user.click(screen.getByRole("button", { name: "Download" }));

    expect(triggerDownload).toHaveBeenCalledWith("file:handouts/map.png");
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Download as zip" })).not.toBeInTheDocument();
  });

  it("offers only a zip download for a single directory", async () => {
    const user = userEvent.setup();

    renderDownloadItems({ relativePath: "handouts/tiles", selectedEntries: [directoryEntry] });

    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Download as zip" }));

    expect(triggerDownload).toHaveBeenCalledWith("zip:handouts/tiles");
  });

  it("downloads each selected file separately, skipping directories", async () => {
    const user = userEvent.setup();

    renderDownloadItems({ selectedEntries: [fileEntry, directoryEntry, otherFileEntry] });
    await user.click(screen.getByRole("button", { name: "Download 2 files" }));

    expect(triggerDownloads).toHaveBeenCalledWith([
      "file:handouts/map.png",
      "file:handouts/portrait.png",
    ]);
  });

  it("zips the whole multi-selection, directories included", async () => {
    const user = userEvent.setup();

    renderDownloadItems({ selectedEntries: [fileEntry, directoryEntry] });
    await user.click(screen.getByRole("button", { name: "Download as zip" }));

    expect(triggerDownload).toHaveBeenCalledWith("zip:handouts/map.png,handouts/tiles");
  });

  it("hides the per-file option when a multi-selection has no files", () => {
    const otherDirectoryEntry: DirectoryEntry = { name: "props", type: "directory" };

    renderDownloadItems({
      relativePath: "tiles",
      selectedEntries: [directoryEntry, otherDirectoryEntry],
    });

    expect(screen.queryByRole("button", { name: /^Download \d+ files?$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download as zip" })).toBeInTheDocument();
  });

  it("uses the singular label when a multi-selection has one file", () => {
    renderDownloadItems({ selectedEntries: [fileEntry, directoryEntry] });

    expect(screen.getByRole("button", { name: "Download 1 file" })).toBeInTheDocument();
  });
});
