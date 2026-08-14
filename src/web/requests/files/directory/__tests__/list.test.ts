import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "#web/requests/http-client.ts";
import { listDirectory } from "../list.ts";

describe("listDirectory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs the encoded path and returns the parsed entries", async () => {
    const entries = [{ name: "tiles", type: "directory" }];
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(entries)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await listDirectory("tiles/legacy pack");

    expect(fetchMock).toHaveBeenCalledWith("/api/files?path=tiles%2Flegacy%20pack", undefined);
    expect(result).toEqual(entries);
  });

  it("throws an ApiError carrying the backend's error message and status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "path escapes the asset tree root" }), {
        status: 400,
        statusText: "Bad Request",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listDirectory("../escaped")).rejects.toMatchObject({
      message: "path escapes the asset tree root",
      statusCode: 400,
    });
  });

  it("falls back to the response status text when the error body is not JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("not json", { status: 500, statusText: "Internal Server Error" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listDirectory("tiles")).rejects.toMatchObject({
      message: "Internal Server Error",
      statusCode: 500,
    });
  });

  it("rejects with an ApiError instance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listDirectory("missing")).rejects.toBeInstanceOf(ApiError);
  });
});
