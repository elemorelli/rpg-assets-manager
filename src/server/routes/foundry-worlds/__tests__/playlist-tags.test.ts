import type { Kysely } from "kysely";
import { describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { computeAudioTagCounts, listAudioTags } = await import("../playlist-tags.ts");

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
};

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
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([
      { path: "sfx/thunder.mp3", tags: ["storm"] },
      { path: "images/map.webp", tags: ["storm"] },
    ]);

    expect(await listAudioTags()).toEqual([{ tag: "storm", count: 1 }]);
  });
});
