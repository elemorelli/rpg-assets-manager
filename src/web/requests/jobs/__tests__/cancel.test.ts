import { beforeEach, describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { cancelJob } from "../cancel.ts";

describe("cancelJob", () => {
  beforeEach(() => {
    stubFetch(new Response(JSON.stringify({ cancelled: true })));
  });

  it("posts to /api/jobs/cancel with no body", async () => {
    const result = await cancelJob();

    expect(fetch).toHaveBeenCalledWith("/api/jobs/cancel", { method: "POST" });
    expect(result).toEqual({ cancelled: true });
  });
});
