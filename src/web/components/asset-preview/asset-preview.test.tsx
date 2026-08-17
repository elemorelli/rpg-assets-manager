// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { THUMBNAIL_THRESHOLD_BYTES } from "#utils/preview.ts";

import { AssetPreview } from "./asset-preview.tsx";

const SIZE_UNDER_THRESHOLD = 1024;
const SIZE_ABOVE_THRESHOLD = THUMBNAIL_THRESHOLD_BYTES + 1;

describe("AssetPreview", () => {
  it("renders a lazy-loaded thumbnail image for a large image file", () => {
    render(
      <AssetPreview
        entry={{ name: "forest.png", type: "file", size: SIZE_ABOVE_THRESHOLD }}
        relativePath="tiles/forest.png"
      />,
    );

    const image = screen.getByRole("img", { name: "forest.png" });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("src", "/api/files/thumbnail?path=tiles%2Fforest.png");
  });

  it("renders the raw file for a small image file", () => {
    render(
      <AssetPreview
        entry={{ name: "sword.png", type: "file", size: SIZE_UNDER_THRESHOLD }}
        relativePath="icons/sword.png"
      />,
    );

    const image = screen.getByRole("img", { name: "sword.png" });
    expect(image).toHaveAttribute("src", "/api/files/raw?path=icons%2Fsword.png");
  });

  it("renders an audio player for an audio file", () => {
    render(
      <AssetPreview
        entry={{ name: "ambient-forest.wav", type: "file", size: SIZE_ABOVE_THRESHOLD }}
        relativePath="audio/ambient-forest.wav"
      />,
    );

    const audio = document.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(audio).toHaveAttribute("src", "/api/files/raw?path=audio%2Fambient-forest.wav");
    expect(audio).toHaveAttribute("preload", "none");
  });

  it("renders a placeholder for an unsupported file type", () => {
    render(<AssetPreview entry={{ name: "sketch.xcf", type: "file" }} relativePath="sketch.xcf" />);

    expect(screen.getByLabelText("No preview available")).toBeInTheDocument();
  });

  it("renders a placeholder without hitting the network for a deleted file", () => {
    render(
      <AssetPreview
        entry={{ name: "forest.png", type: "file", size: 100, syncStatus: "deleted" }}
        relativePath="tiles/forest.png"
      />,
    );

    expect(screen.getByLabelText("Deleted file, no preview available")).toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
    expect(document.querySelector("audio")).not.toBeInTheDocument();
  });

  it("renders a folder icon for a directory", () => {
    render(<AssetPreview entry={{ name: "tiles", type: "directory" }} relativePath="tiles" />);

    expect(screen.getByLabelText("Folder")).toBeInTheDocument();
  });

  it("marks the rendered image with the requested size", () => {
    render(
      <AssetPreview
        entry={{ name: "forest.png", type: "file", size: SIZE_UNDER_THRESHOLD }}
        relativePath="tiles/forest.png"
        size="large"
      />,
    );

    expect(screen.getByRole("img", { name: "forest.png" })).toHaveAttribute("data-size", "large");
  });

  it("defaults to the small size when none is given", () => {
    render(
      <AssetPreview
        entry={{ name: "forest.png", type: "file", size: SIZE_UNDER_THRESHOLD }}
        relativePath="tiles/forest.png"
      />,
    );

    expect(screen.getByRole("img", { name: "forest.png" })).toHaveAttribute("data-size", "small");
  });

  it("renders a hidden hover-zoom image alongside a small-size image", () => {
    render(
      <AssetPreview
        entry={{ name: "forest.png", type: "file", size: SIZE_UNDER_THRESHOLD }}
        relativePath="tiles/forest.png"
      />,
    );

    const zoomImage = document.querySelector('img[aria-hidden="true"]');
    expect(zoomImage).toHaveAttribute("src", "/api/files/raw?path=tiles%2Fforest.png");
  });

  it("does not render a hover-zoom image alongside a large-size image", () => {
    render(
      <AssetPreview
        entry={{ name: "forest.png", type: "file", size: SIZE_UNDER_THRESHOLD }}
        relativePath="tiles/forest.png"
        size="large"
      />,
    );

    expect(document.querySelector('img[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it("calls onOpen when a small previewable image is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const entry = { name: "forest.png", type: "file" as const, size: SIZE_UNDER_THRESHOLD };

    render(<AssetPreview entry={entry} relativePath="tiles/forest.png" onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: "forest.png" }));

    expect(onOpen).toHaveBeenCalledWith(entry);
  });

  it("calls onOpen when Enter is pressed on a focused small image", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const entry = { name: "forest.png", type: "file" as const, size: SIZE_UNDER_THRESHOLD };

    render(<AssetPreview entry={entry} relativePath="tiles/forest.png" onOpen={onOpen} />);
    screen.getByRole("button", { name: "forest.png" }).focus();
    await user.keyboard("{Enter}");

    expect(onOpen).toHaveBeenCalledWith(entry);
  });

  it("does not make the image interactive when onOpen is omitted", () => {
    render(
      <AssetPreview
        entry={{ name: "forest.png", type: "file", size: SIZE_UNDER_THRESHOLD }}
        relativePath="tiles/forest.png"
      />,
    );

    expect(screen.getByRole("img", { name: "forest.png" })).not.toHaveAttribute("tabindex");
  });

  it("calls onOpen when a large previewable image is clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const entry = { name: "forest.png", type: "file" as const, size: SIZE_UNDER_THRESHOLD };

    render(
      <AssetPreview entry={entry} relativePath="tiles/forest.png" size="large" onOpen={onOpen} />,
    );
    await user.click(screen.getByRole("button", { name: "forest.png" }));

    expect(onOpen).toHaveBeenCalledWith(entry);
  });

  it("does not make an audio preview interactive even when onOpen is given", () => {
    render(
      <AssetPreview
        entry={{ name: "ambient.wav", type: "file", size: SIZE_ABOVE_THRESHOLD }}
        relativePath="audio/ambient.wav"
        onOpen={vi.fn()}
      />,
    );

    expect(document.querySelector("audio")).not.toHaveAttribute("tabindex");
  });
});
