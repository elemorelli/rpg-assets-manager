import { describe, expect, it } from "vitest";
import { buildPurgeUrls } from "../purgeUrls.ts";

describe("buildPurgeUrls", () => {
  it("builds a URL per added, modified, and deleted path", () => {
    const changeSet = {
      added: ["tiles/new.png"],
      modified: ["tiles/changed.png"],
      deleted: ["tiles/gone.png"],
      renamed: [],
    };

    expect(buildPurgeUrls(changeSet, "https://assets.example.com")).toEqual([
      "https://assets.example.com/tiles/new.png",
      "https://assets.example.com/tiles/changed.png",
      "https://assets.example.com/tiles/gone.png",
    ]);
  });

  it("builds both the old and new URL for a rename", () => {
    const changeSet = {
      added: [],
      modified: [],
      deleted: [],
      renamed: [{ oldPath: "tiles/old.png", newPath: "tiles/new.png" }],
    };

    expect(buildPurgeUrls(changeSet, "https://assets.example.com")).toEqual([
      "https://assets.example.com/tiles/old.png",
      "https://assets.example.com/tiles/new.png",
    ]);
  });

  it("does not duplicate a URL that appears more than once", () => {
    const changeSet = {
      added: ["tiles/a.png"],
      modified: [],
      deleted: [],
      renamed: [{ oldPath: "tiles/x.png", newPath: "tiles/a.png" }],
    };

    expect(buildPurgeUrls(changeSet, "https://assets.example.com")).toEqual([
      "https://assets.example.com/tiles/a.png",
      "https://assets.example.com/tiles/x.png",
    ]);
  });

  it("joins the base URL and path with exactly one slash regardless of a trailing slash", () => {
    const changeSet = { added: ["a.png"], modified: [], deleted: [], renamed: [] };

    expect(buildPurgeUrls(changeSet, "https://assets.example.com/")).toEqual([
      "https://assets.example.com/a.png",
    ]);
  });
});
