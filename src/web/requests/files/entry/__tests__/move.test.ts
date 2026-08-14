import { afterEach, describe, expect, it, vi } from "vitest";
import { moveEntry } from "../move.ts";

describe("moveEntry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the source and destination paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ moved: true })));
    vi.stubGlobal("fetch", fetchMock);

    await moveEntry("a.png", "tiles/a.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPath: "a.png", toPath: "tiles/a.png" }),
    });
  });
});
