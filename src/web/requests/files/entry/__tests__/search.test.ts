import { describe, expect, it } from "vitest";

import { ApiError } from "#web/requests/http-client.ts";
import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { searchEntries } from "../search.ts";

describe("searchEntries", () => {
  it("GETs the encoded query and returns the parsed results", async () => {
    const results = [{ relativePath: "tiles/forest.png", type: "file" }];
    const fetchMock = stubFetch(new Response(JSON.stringify(results)));

    const result = await searchEntries("legacy pack");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/search?q=legacy%20pack", undefined);
    expect(result).toEqual(results);
  });

  it("throws an ApiError carrying the backend's error message and status", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: "search failed" }), {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(searchEntries("forest")).rejects.toMatchObject({
      message: "search failed",
      statusCode: 500,
    });
    await expect(searchEntries("forest")).rejects.toBeInstanceOf(ApiError);
  });
});
