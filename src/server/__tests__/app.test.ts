import { describe, expect, it } from "vitest";

import { buildApp } from "../app.ts";
import { HTTP_STATUS } from "../errors/index.ts";

describe("buildApp", () => {
  it("responds ok on /api/health", async () => {
    const app = buildApp({
      webDistDir: null,
      assetTreeRoot: "/tmp/unused-in-this-test",
      thumbnailCacheDir: "/tmp/unused-in-this-test",
    });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
