import { describe, expect, it } from "vitest";

import { buildZipDownloadUrl } from "../download-zip-url.ts";

describe("buildZipDownloadUrl", () => {
  it("repeats the path parameter once per selected entry, URL-encoded", () => {
    expect(buildZipDownloadUrl(["maps/tiles", "maps/boss fight.ogg"])).toBe(
      "/api/entries/download-zip?path=maps%2Ftiles&path=maps%2Fboss+fight.ogg",
    );
  });
});
