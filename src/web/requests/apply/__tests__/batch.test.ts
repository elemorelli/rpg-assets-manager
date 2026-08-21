import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { applyBatch } from "../batch.ts";

describe("applyBatch", () => {
  it("POSTs to /api/apply with no body when called with no arguments", async () => {
    const summary = {
      added: 1,
      modified: 0,
      deleted: 0,
      renamed: 0,
      outcome: "applied",
      syncRunId: 1,
    };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    const result = await applyBatch();

    expect(fetchMock).toHaveBeenCalledWith("/api/apply", { method: "POST" });
    expect(result).toEqual(summary);
  });

  it("POSTs to /api/apply with the given path and scope", async () => {
    const summary = {
      added: 0,
      modified: 0,
      deleted: 0,
      renamed: 0,
      outcome: "applied",
      syncRunId: 1,
    };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    await applyBatch("tiles", "subtree");

    expect(fetchMock).toHaveBeenCalledWith("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles", scope: "subtree" }),
    });
  });
});
