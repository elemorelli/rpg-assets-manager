import { describe, expect, it } from "vitest";

import { computeConversionPlan } from "../conversion.ts";

describe("computeConversionPlan", () => {
  it("plans image and audio candidates with their destination paths", () => {
    const plan = computeConversionPlan([
      { relativePath: "tiles/forest.png" },
      { relativePath: "audio/theme.mp3" },
    ]);

    expect(plan.candidates).toEqual([
      {
        relativePath: "audio/theme.mp3",
        kind: "audio",
        destinationPath: "audio/theme.ogg",
        willOverwrite: false,
      },
      {
        relativePath: "tiles/forest.png",
        kind: "image",
        destinationPath: "tiles/forest.webp",
        willOverwrite: false,
      },
    ]);
  });

  it("matches source extensions case-insensitively", () => {
    const plan = computeConversionPlan([{ relativePath: "tiles/forest.PNG" }]);

    expect(plan.candidates).toEqual([
      {
        relativePath: "tiles/forest.PNG",
        kind: "image",
        destinationPath: "tiles/forest.webp",
        willOverwrite: false,
      },
    ]);
  });

  it("ignores files whose extension is not a conversion source", () => {
    const plan = computeConversionPlan([
      { relativePath: "tiles/forest.webp" },
      { relativePath: "audio/theme.ogg" },
      { relativePath: "docs/notes.txt" },
    ]);

    expect(plan.candidates).toEqual([]);
  });

  it("skips files inside a directory that directly contains a .skip file", () => {
    const plan = computeConversionPlan([
      { relativePath: "tiles/legacy-pack/.skip" },
      { relativePath: "tiles/legacy-pack/old-tile.png" },
      { relativePath: "tiles/forest.png" },
    ]);

    expect(plan.candidates).toEqual([
      {
        relativePath: "tiles/forest.png",
        kind: "image",
        destinationPath: "tiles/forest.webp",
        willOverwrite: false,
      },
    ]);
  });

  it("does not extend .skip to a subdirectory of the directory that contains it", () => {
    const plan = computeConversionPlan([
      { relativePath: "tiles/legacy-pack/.skip" },
      { relativePath: "tiles/legacy-pack/nested/old-tile.png" },
    ]);

    expect(plan.candidates).toEqual([
      {
        relativePath: "tiles/legacy-pack/nested/old-tile.png",
        kind: "image",
        destinationPath: "tiles/legacy-pack/nested/old-tile.webp",
        willOverwrite: false,
      },
    ]);
  });

  it("flags a candidate for overwrite when the destination path already exists, instead of skipping it", () => {
    const plan = computeConversionPlan([
      { relativePath: "tiles/forest.png" },
      { relativePath: "tiles/forest.webp" },
    ]);

    expect(plan.candidates).toEqual([
      {
        relativePath: "tiles/forest.png",
        kind: "image",
        destinationPath: "tiles/forest.webp",
        willOverwrite: true,
      },
    ]);
  });
});
