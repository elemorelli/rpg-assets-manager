import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { moveEntry } from "../move.ts";

describe("moveEntry", () => {
  it("POSTs the source and destination paths", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ moved: true })));

    await moveEntry("a.png", "tiles/a.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/entries/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPath: "a.png", toPath: "tiles/a.png", overwrite: false }),
    });
  });

  it("POSTs overwrite as true when requested", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ moved: true })));

    await moveEntry("a.png", "tiles/a.png", true);

    expect(fetchMock).toHaveBeenCalledWith("/api/entries/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPath: "a.png", toPath: "tiles/a.png", overwrite: true }),
    });
  });
});
