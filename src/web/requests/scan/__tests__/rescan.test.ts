import { describe, expect, it } from "vitest";

import type { RescanSummary } from "#utils/rescan.ts";
import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { rescan } from "../rescan.ts";

describe("rescan", () => {
  it("POSTs the request as its JSON body and returns the summary", async () => {
    const summary: RescanSummary = {
      hashed: 2,
      unchanged: 1,
      removed: 0,
      renamed: 0,
      removedFolders: 0,
    };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    const result = await rescan({});

    expect(fetchMock).toHaveBeenCalledWith("/api/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(result).toEqual(summary);
  });

  it("forwards forceRehash when set", async () => {
    const summary: RescanSummary = {
      hashed: 2,
      unchanged: 0,
      removed: 0,
      renamed: 0,
      removedFolders: 0,
    };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    await rescan({ forceRehash: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forceRehash: true }),
    });
  });

  it("forwards removeEmptyFolders when set", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({})));

    await rescan({ removeEmptyFolders: true });

    expect(fetchMock).toHaveBeenCalledWith("/api/rescan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeEmptyFolders: true }),
    });
  });
});
