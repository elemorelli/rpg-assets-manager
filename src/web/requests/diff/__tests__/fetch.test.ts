import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchDiff } from "../fetch.ts";

describe("fetchDiff", () => {
  it("GETs /api/diff with no query when called with no arguments", async () => {
    const diff = {
      added: ["a.png"],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    };
    const fetchMock = stubFetch(new Response(JSON.stringify(diff)));

    const result = await fetchDiff();

    expect(fetchMock).toHaveBeenCalledWith("/api/diff", undefined);
    expect(result).toEqual(diff);
  });

  it("GETs /api/diff with the given path and scope", async () => {
    const diff = {
      added: [],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    };
    const fetchMock = stubFetch(new Response(JSON.stringify(diff)));

    await fetchDiff("tiles", "subtree");

    expect(fetchMock).toHaveBeenCalledWith("/api/diff?path=tiles&scope=subtree", undefined);
  });
});
