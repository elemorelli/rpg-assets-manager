import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteEntry } from "../deleteEntry.ts";

describe("deleteEntry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a DELETE with a JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ deleted: true })));
    vi.stubGlobal("fetch", fetchMock);

    await deleteEntry("tiles/old.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/old.png" }),
    });
  });
});
