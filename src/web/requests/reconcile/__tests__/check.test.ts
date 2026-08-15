import { afterEach, describe, expect, it, vi } from "vitest";

import { reconcile } from "../check.ts";

describe("reconcile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /api/reconcile and returns the parsed result", async () => {
    const result = {
      matchCount: 3,
      missingOnSource: [],
      missingOnDestination: ["tiles/unsynced.png"],
      differs: [],
      errors: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result)));
    vi.stubGlobal("fetch", fetchMock);

    const response = await reconcile();

    expect(fetchMock).toHaveBeenCalledWith("/api/reconcile", { method: "POST" });
    expect(response).toEqual(result);
  });
});
