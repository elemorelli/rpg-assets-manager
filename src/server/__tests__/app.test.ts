import { describe, expect, it } from "vitest";

import { EMPTY_SYNC_STATUS } from "#server/sync-status/sync-status-store.ts";

import { buildApp } from "../app.ts";
import { HTTP_STATUS } from "../errors/index.ts";

describe("buildApp", () => {
  it("serves the empty sync status on /api/status before tracking starts", async () => {
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: "/tmp/unused-in-this-test",
      thumbnailCacheDir: "/tmp/unused-in-this-test",
    });

    const response = await app.inject({ method: "GET", url: "/api/status" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual(EMPTY_SYNC_STATUS);
  });
});
