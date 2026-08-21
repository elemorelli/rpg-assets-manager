import { describe, expect, it } from "vitest";

import { buildFoundryPlaylistExportUrl } from "../playlist-export-url.ts";

describe("buildFoundryPlaylistExportUrl", () => {
  it("builds the export URL with the tag URL-encoded", () => {
    expect(buildFoundryPlaylistExportUrl("boss fight")).toBe(
      "/api/foundry-worlds/playlists/boss%20fight/export",
    );
  });
});
