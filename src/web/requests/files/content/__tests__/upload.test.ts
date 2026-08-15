import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "../upload.ts";

describe("uploadFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs a multipart form with the target path and file", async () => {
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
