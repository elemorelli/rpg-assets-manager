import { describe, expect, it } from "vitest";
import {
  buildRawFileUrl,
  buildThumbnailUrl,
  classifyPreviewKind,
  mimeTypeForFile,
  resolvePreviewSource,
  shouldServeThumbnail,
  THUMBNAIL_THRESHOLD_BYTES,
  thumbnailCacheFileName,
} from "../preview.ts";

const SIZE_UNDER_THRESHOLD = 1024;
const SIZE_ABOVE_THRESHOLD = THUMBNAIL_THRESHOLD_BYTES + 1;

describe("classifyPreviewKind", () => {
  it("classifies known image extensions as image, case-insensitively", () => {
    expect(classifyPreviewKind("forest.png")).toBe("image");
    expect(classifyPreviewKind("forest.JPG")).toBe("image");
  });

  it("classifies known audio extensions as audio", () => {
    expect(classifyPreviewKind("ambient-forest.wav")).toBe("audio");
  });

  it("classifies everything else as unsupported", () => {
    expect(classifyPreviewKind("sketch.xcf")).toBe("unsupported");
  });
});

describe("mimeTypeForFile", () => {
  it("returns the mime type for a known extension", () => {
    expect(mimeTypeForFile("forest.png")).toBe("image/png");
    expect(mimeTypeForFile("ambient-forest.wav")).toBe("audio/wav");
  });

  it("returns undefined for an unknown extension", () => {
    expect(mimeTypeForFile("sketch.xcf")).toBeUndefined();
  });
});

describe("shouldServeThumbnail", () => {
  it("is false at and under the threshold", () => {
    expect(shouldServeThumbnail(THUMBNAIL_THRESHOLD_BYTES)).toBe(false);
    expect(shouldServeThumbnail(SIZE_UNDER_THRESHOLD)).toBe(false);
  });

  it("is true above the threshold", () => {
    expect(shouldServeThumbnail(SIZE_ABOVE_THRESHOLD)).toBe(true);
  });
});

describe("resolvePreviewSource", () => {
  it("returns none for directories", () => {
    expect(resolvePreviewSource({ type: "directory", name: "tiles" })).toEqual({ kind: "none" });
  });

  it("returns an image source without a thumbnail under the threshold", () => {
    expect(
      resolvePreviewSource({ type: "file", name: "forest.png", size: SIZE_UNDER_THRESHOLD }),
    ).toEqual({
      kind: "image",
      useThumbnail: false,
    });
  });

  it("returns an image source with a thumbnail above the threshold", () => {
    expect(
      resolvePreviewSource({ type: "file", name: "forest.png", size: SIZE_ABOVE_THRESHOLD }),
    ).toEqual({
      kind: "image",
      useThumbnail: true,
    });
  });

  it("returns an audio source for audio files regardless of size", () => {
    expect(
      resolvePreviewSource({
        type: "file",
        name: "ambient-forest.wav",
        size: SIZE_ABOVE_THRESHOLD,
      }),
    ).toEqual({ kind: "audio" });
  });

  it("returns none for unsupported file types", () => {
    expect(
      resolvePreviewSource({ type: "file", name: "sketch.xcf", size: SIZE_UNDER_THRESHOLD }),
    ).toEqual({
      kind: "none",
    });
  });
});

describe("thumbnailCacheFileName", () => {
  it("appends the webp extension to the hash", () => {
    expect(thumbnailCacheFileName("abc123")).toBe("abc123.webp");
  });
});

describe("buildRawFileUrl", () => {
  it("builds a URL-encoded raw file endpoint", () => {
    expect(buildRawFileUrl("tiles/forest night.png")).toBe(
      "/api/files/raw?path=tiles%2Fforest%20night.png",
    );
  });
});

describe("buildThumbnailUrl", () => {
  it("builds a URL-encoded thumbnail endpoint", () => {
    expect(buildThumbnailUrl("tiles/forest night.png")).toBe(
      "/api/files/thumbnail?path=tiles%2Fforest%20night.png",
    );
  });
});
