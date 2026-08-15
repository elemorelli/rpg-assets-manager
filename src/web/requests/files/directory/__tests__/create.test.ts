import { afterEach, describe, expect, it, vi } from "vitest";

import { createDirectory } from "../create.ts";

describe("createDirectory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs a JSON body with the path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ created: true })));
    vi.stubGlobal("fetch", fetchMock);

    await createDirectory("tiles/new-pack");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/mkdir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/new-pack" }),
    });
  });
});
