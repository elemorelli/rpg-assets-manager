import { describe, expect, it } from "vitest";

import { ApiError } from "#web/requests/http-client.ts";
import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { listDirectory } from "../list.ts";

describe("listDirectory", () => {
  it("GETs the encoded path and returns the parsed entries", async () => {
    const entries = [{ name: "tiles", type: "directory" }];
    const fetchMock = stubFetch(new Response(JSON.stringify(entries)));

    const result = await listDirectory("tiles/legacy pack");

    expect(fetchMock).toHaveBeenCalledWith("/api/files?path=tiles%2Flegacy%20pack", undefined);
    expect(result).toEqual(entries);
  });

  it("throws an ApiError carrying the backend's error message and status", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: "path escapes the asset tree root" }), {
        status: 400,
        statusText: "Bad Request",
      }),
    );

    await expect(listDirectory("../escaped")).rejects.toMatchObject({
      message: "path escapes the asset tree root",
      statusCode: 400,
    });
  });

  it("falls back to the response status text when the error body is not JSON", async () => {
    stubFetch(new Response("not json", { status: 500, statusText: "Internal Server Error" }));

    await expect(listDirectory("tiles")).rejects.toMatchObject({
      message: "Internal Server Error",
      statusCode: 500,
    });
  });

  it("rejects with an ApiError instance", async () => {
    stubFetch(new Response("{}", { status: 404 }));

    await expect(listDirectory("missing")).rejects.toBeInstanceOf(ApiError);
  });
});
