import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchDiff } from "../fetch.ts";

describe("fetchDiff", () => {
  it("GETs /api/diff and returns the parsed batch diff", async () => {
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
});
