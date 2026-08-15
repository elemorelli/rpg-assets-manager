import { afterEach, describe, expect, it, vi } from "vitest";

import { acknowledgeWorld } from "../acknowledge-world.ts";

const SYNC_RUN_ID = 42;

describe("acknowledgeWorld", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the world and the acknowledged flag for the given sync run", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ acknowledged: true })));
    vi.stubGlobal("fetch", fetchMock);

    await acknowledgeWorld(SYNC_RUN_ID, "kingmaker", true);

    expect(fetchMock).toHaveBeenCalledWith(`/api/sync-runs/${SYNC_RUN_ID}/world-acknowledgement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world: "kingmaker", acknowledged: true }),
    });
  });
});
