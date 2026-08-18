import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { acknowledgeWorld } from "../acknowledge-world.ts";

const SYNC_RUN_ID = 42;

describe("acknowledgeWorld", () => {
  it("POSTs the world and the acknowledged flag for the given sync run", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ acknowledged: true })));

    await acknowledgeWorld(SYNC_RUN_ID, "kingmaker", true);

    expect(fetchMock).toHaveBeenCalledWith(`/api/sync-runs/${SYNC_RUN_ID}/world-acknowledgement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world: "kingmaker", acknowledged: true }),
    });
  });
});
