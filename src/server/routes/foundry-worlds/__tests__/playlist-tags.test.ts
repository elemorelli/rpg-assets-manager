import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { computeAudioTagCounts, listAudioTags } from "../playlist-tags.ts";

describe("computeAudioTagCounts", () => {
  it("counts audio assets per tag, ignoring non-audio files", () => {
    const counts = computeAudioTagCounts([
      { path: "sfx/thunder.mp3", tags: ["storm", "combat"] },
      { path: "sfx/rain.ogg", tags: ["storm"] },
      { path: "images/storm-map.webp", tags: ["storm"] },
    ]);

    expect(counts).toEqual([
      { tag: "combat", count: 1 },
      { tag: "storm", count: 2 },
    ]);
  });

  it("returns an empty array when there are no audio assets", () => {
    expect(computeAudioTagCounts([{ path: "images/map.webp", tags: ["storm"] }])).toEqual([]);
  });

  it("excludes untagged audio assets from every tag", () => {
    expect(computeAudioTagCounts([{ path: "sfx/thunder.mp3", tags: [] }])).toEqual([]);
  });
});

describe("listAudioTags", () => {
  it("reads assets from the db and reuses computeAudioTagCounts", async () => {
    const db = createFakeDb();

    db.seed("assets", [
      {
        id: "1",
        path: "sfx/thunder.mp3",
        size: 1,
        hash: "h1",
        tags: ["storm"],
      },
      {
        id: "2",
        path: "images/map.webp",
        size: 1,
        hash: "h2",
        tags: ["storm"],
      },
    ]);

    expect(await listAudioTags(db)).toEqual([{ tag: "storm", count: 1 }]);
  });
});
