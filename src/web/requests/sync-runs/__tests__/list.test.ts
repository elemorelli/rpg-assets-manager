import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchSyncRuns } from "../list.ts";

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
    const fetchMock = stubFetch(new Response(JSON.stringify(runs)));

    const result = await fetchSyncRuns();

    expect(fetchMock).toHaveBeenCalledWith("/api/sync-runs", undefined);
    expect(result).toEqual(runs);
  });
});
