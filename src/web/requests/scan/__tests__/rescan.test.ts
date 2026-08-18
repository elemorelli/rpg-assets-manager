import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { rescan } from "../rescan.ts";

describe("rescan", () => {
  it("POSTs a JSON body defaulting forceRehash to false", async () => {
    const summary = { hashed: 2, unchanged: 1, removed: 0 };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    const result = await rescan();

    expect(fetchMock).toHaveBeenCalledWith("/api/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRehash: false }),
    });
    expect(result).toEqual(summary);
  });

  it("forwards forceRehash when set", async () => {
    const summary = { hashed: 2, unchanged: 0, removed: 0 };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    await rescan(true);

    expect(fetchMock).toHaveBeenCalledWith("/api/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRehash: true }),
    });
  });
});
