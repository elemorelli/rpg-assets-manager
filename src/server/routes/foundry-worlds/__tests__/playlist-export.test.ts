import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import {
  buildFoundryPlaylistExport,
  findAudioAssetsByTag,
  sanitizeFilenameSegment,
} from "../playlist-export.ts";

const BASE_URL = "https://assets.example.com";

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
    const db = createFakeDb();

    db.seed("assets", [
      { id: "1", path: "sfx/thunder.mp3", size: 1, hash: "h1", tags: ["storm"] },
      { id: "2", path: "sfx/rain.ogg", size: 1, hash: "h2", tags: ["storm"] },
      { id: "3", path: "images/storm-map.webp", size: 1, hash: "h3", tags: ["storm"] },
      { id: "4", path: "sfx/wind.wav", size: 1, hash: "h4", tags: ["ambience"] },
    ]);

    expect(await findAudioAssetsByTag(db, "storm")).toEqual([
      { path: "sfx/rain.ogg" },
      { path: "sfx/thunder.mp3" },
    ]);
  });

  it("returns an empty array when nothing carries the tag", async () => {
    const db = createFakeDb();

    expect(await findAudioAssetsByTag(db, "missing")).toEqual([]);
  });
});
