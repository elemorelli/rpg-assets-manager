import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createDirectory,
  deleteEntry,
  listDirectory,
  moveEntry,
  renameEntry,
  uploadFile,
} from "./api.ts";

describe("api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listDirectory", () => {
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

  it("createDirectory POSTs a JSON body with the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ created: true })));
    vi.stubGlobal("fetch", fetchMock);

    await createDirectory("tiles/new-pack");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/mkdir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/new-pack" }),
    });
  });

  it("deleteEntry sends a DELETE with a JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ deleted: true })));
    vi.stubGlobal("fetch", fetchMock);

    await deleteEntry("tiles/old.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/old.png" }),
    });
  });

  it("renameEntry POSTs the path and the new name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ renamed: true })));
    vi.stubGlobal("fetch", fetchMock);

    await renameEntry("tiles/old.png", "new.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/old.png", newName: "new.png" }),
    });
  });

  it("moveEntry POSTs the source and destination paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ moved: true })));
    vi.stubGlobal("fetch", fetchMock);

    await moveEntry("a.png", "tiles/a.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPath: "a.png", toPath: "tiles/a.png" }),
    });
  });

  it("uploadFile POSTs a multipart form with the target path and file", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ uploaded: "map.png" })));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["content"], "map.png", { type: "image/png" });

    await uploadFile("tiles", file);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const form = init.body as FormData;

    expect(url).toBe("/api/files/upload");
    expect(init.method).toBe("POST");
    expect(form.get("path")).toBe("tiles");
    expect(form.get("file")).toBe(file);
  });
});
