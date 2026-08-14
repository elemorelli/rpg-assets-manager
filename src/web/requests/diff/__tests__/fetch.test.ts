import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDiff } from "../fetch.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDiff", () => {
  it("GETs /api/diff and returns the parsed batch diff", async () => {
    const diff = {
      added: ["a.png"],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(diff),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDiff();

    expect(fetchMock).toHaveBeenCalledWith("/api/diff", undefined);
    expect(result).toEqual(diff);
  });
});
