import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { uploadFile } from "../upload.ts";

describe("uploadFile", () => {
  it("POSTs a multipart form with the target path and file", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ uploaded: "map.png" })));
    const file = new File(["content"], "map.png", { type: "image/png" });

    await uploadFile("tiles", file);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const form = init.body as FormData;

    expect(url).toBe("/api/files/upload");
    expect(init.method).toBe("POST");
    expect(form.get("path")).toBe("tiles");
    expect(form.get("file")).toBe(file);
    expect(form.get("overwrite")).toBe("false");
  });

  it("marks the request as an overwrite when requested", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ uploaded: "map.png" })));
    const file = new File(["content"], "map.png", { type: "image/png" });

    await uploadFile("tiles", file, true);

    const [, init] = fetchMock.mock.calls[0];
    const form = init.body as FormData;

    expect(form.get("overwrite")).toBe("true");
  });

  it("appends path and overwrite before the file, so the server can read them before streaming the file", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ uploaded: "map.png" })));
    const file = new File(["content"], "map.png", { type: "image/png" });

    await uploadFile("tiles", file, true);

    const [, init] = fetchMock.mock.calls[0];
    const form = init.body as FormData;
    const fieldOrder = Array.from(form.keys());

    expect(fieldOrder.indexOf("path")).toBeLessThan(fieldOrder.indexOf("file"));
    expect(fieldOrder.indexOf("overwrite")).toBeLessThan(fieldOrder.indexOf("file"));
  });
});
