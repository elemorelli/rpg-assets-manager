import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { importFromYoutube } from "../import.ts";
import { fetchYoutubeMetadata } from "../metadata.ts";

describe("fetchYoutubeMetadata", () => {
  it("GETs the metadata endpoint with the URL encoded", async () => {
    const metadata = { videoId: "abc", title: "T", durationSeconds: 1, suggestedFileName: "t" };
    const fetchMock = stubFetch(new Response(JSON.stringify(metadata)));

    const result = await fetchYoutubeMetadata("https://youtu.be/abc?t=1&x=y");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/youtube/metadata?url=https%3A%2F%2Fyoutu.be%2Fabc%3Ft%3D1%26x%3Dy",
      undefined,
    );
    expect(result).toEqual(metadata);
  });
});

describe("importFromYoutube", () => {
  it("POSTs the import request", async () => {
    const body = {
      url: "https://youtu.be/abc",
      directoryPath: "music",
      fileName: "battle",
      tags: ["epic"],
      overwrite: false,
    };
    const fetchMock = stubFetch(new Response(JSON.stringify({ imported: "music/battle.ogg" })));

    const result = await importFromYoutube(body);

    expect(fetchMock).toHaveBeenCalledWith("/api/youtube/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(result).toEqual({ imported: "music/battle.ogg" });
  });
});
