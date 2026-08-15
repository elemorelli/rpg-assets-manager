import { afterEach, describe, expect, it, vi } from "vitest";

import { convert } from "../assets.ts";

describe("convert", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs to /api/convert", async () => {
    const summary = { converted: 3, conflicts: 1 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(summary)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convert();

    expect(fetchMock).toHaveBeenCalledWith("/api/convert", { method: "POST" });
    expect(result).toEqual(summary);
  });
});
