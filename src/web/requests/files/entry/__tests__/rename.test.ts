import { afterEach, describe, expect, it, vi } from "vitest";

import { renameEntry } from "../rename.ts";

describe("renameEntry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the path and the new name", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ renamed: true })));
    vi.stubGlobal("fetch", fetchMock);

    await renameEntry("tiles/old.png", "new.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/old.png", newName: "new.png" }),
    });
  });
});
