import type { Kysely } from "kysely";
import { describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

const BASE_URL = "https://assets.example.com";

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { buildFoundryPlaylistExport, findAudioAssetsByTag, sanitizeFilenameSegment } = await import(
  "../playlist-export.ts"
);

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
};

describe("buildFoundryPlaylistExport", () => {
  it("builds a Playlist document with one PlaylistSound per asset, in path order", () => {
    const playlist = buildFoundryPlaylistExport(
      "storm",
      [{ path: "sfx/rain.ogg" }, { path: "sfx/thunder.mp3" }],
      BASE_URL,
    );

    expect(playlist).toEqual({
      name: "storm",
      description: "",
      sounds: [
        {
          name: "rain",
          path: `${BASE_URL}/sfx/rain.ogg`,
          channel: "music",
          playing: false,
          pausedTime: null,
          repeat: false,
          volume: 0.5,
          fade: null,
          sort: 0,
        },
        {
          name: "thunder",
          path: `${BASE_URL}/sfx/thunder.mp3`,
          channel: "music",
          playing: false,
          pausedTime: null,
          repeat: false,
          volume: 0.5,
          fade: null,
          sort: 1,
        },
      ],
      mode: 1,
      playing: false,
      fade: null,
      folder: null,
      sorting: "a",
      seed: null,
      sort: 0,
      ownership: { default: 0 },
      flags: {},
    });
  });

  it("strips only the file extension from the sound name, keeping the rest of the filename", () => {
    const playlist = buildFoundryPlaylistExport(
      "ambience",
      [{ path: "loops/deep.cave.wav" }],
      BASE_URL,
    );

    expect(playlist.sounds[0]?.name).toBe("deep.cave");
  });
});

describe("sanitizeFilenameSegment", () => {
  it("replaces characters outside [a-zA-Z0-9-_] with a dash", () => {
    expect(sanitizeFilenameSegment("battle music!")).toBe("battle-music-");
  });
});

describe("findAudioAssetsByTag", () => {
  it("returns only audio assets carrying the tag, sorted by path", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([
      { path: "sfx/thunder.mp3", tags: ["storm"] },
      { path: "sfx/rain.ogg", tags: ["storm"] },
      { path: "images/storm-map.webp", tags: ["storm"] },
      { path: "sfx/wind.wav", tags: ["ambience"] },
    ]);

    expect(await findAudioAssetsByTag("storm")).toEqual([
      { path: "sfx/rain.ogg" },
      { path: "sfx/thunder.mp3" },
    ]);
  });

  it("returns an empty array when nothing carries the tag", async () => {
    const mock = createMock();

    mock.selectFrom("assets").execute.mockResolvedValueOnce([]);

    expect(await findAudioAssetsByTag("missing")).toEqual([]);
  });
});
