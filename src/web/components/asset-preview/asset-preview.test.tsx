// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

  it("renders a placeholder for a directory", () => {
    render(<AssetPreview entry={{ name: "tiles", type: "directory" }} relativePath="tiles" />);

    expect(screen.getByLabelText("No preview available")).toBeInTheDocument();
  });
});
