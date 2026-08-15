import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchSyncRuns } from "../list.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSyncRuns", () => {
  it("GETs /api/sync-runs and returns the parsed run list", async () => {
    const runs = [
      {
        id: 1,
        startedAt: "2026-08-14T00:00:00.000Z",
        finishedAt: "2026-08-14T00:01:00.000Z",
        addedCount: 1,
        modifiedCount: 0,
        deletedCount: 0,
        renamedCount: 1,
        outcome: "applied",
        generatedMacro: "// macro",
        worldAcknowledgements: { kingmaker: false },
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(runs),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSyncRuns();

    expect(fetchMock).toHaveBeenCalledWith("/api/sync-runs", undefined);
    expect(result).toEqual(runs);
  });
});
