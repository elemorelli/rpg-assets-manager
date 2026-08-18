import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { reconcile } from "../check.ts";

describe("reconcile", () => {
  it("POSTs to /api/reconcile and returns the parsed result", async () => {
    const result = {
      matchCount: 3,
      missingOnSource: [],
      missingOnDestination: ["tiles/unsynced.png"],
      differs: [],
      errors: [],
    };
    const fetchMock = stubFetch(new Response(JSON.stringify(result)));

    const response = await reconcile();

    expect(fetchMock).toHaveBeenCalledWith("/api/reconcile", { method: "POST" });
    expect(response).toEqual(result);
  });
});
