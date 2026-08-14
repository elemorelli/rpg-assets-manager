import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../httpClient.ts";
import { searchEntries } from "../searchEntries.ts";

describe("searchEntries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs the encoded query and returns the parsed results", async () => {
    const results = [{ relativePath: "tiles/forest.png", type: "file" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(results)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchEntries("legacy pack");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/search?q=legacy%20pack", undefined);
    expect(result).toEqual(results);
  });

  it("throws an ApiError carrying the backend's error message and status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "search failed" }), {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchEntries("forest")).rejects.toMatchObject({
      message: "search failed",
      statusCode: 500,
    });
    await expect(searchEntries("forest")).rejects.toBeInstanceOf(ApiError);
  });
});
