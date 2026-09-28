import { describe, expect, it } from "vitest";

import { buildFileDownloadUrl } from "../download-url.ts";

describe("buildFileDownloadUrl", () => {
  it("builds the download URL with the path URL-encoded", () => {
    expect(buildFileDownloadUrl("maps/boss fight.ogg")).toBe(
      "/api/files/download?path=maps%2Fboss%20fight.ogg",
    );
  });
});
