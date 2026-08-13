import { describe, expect, it } from "vitest";
import { buildApp } from "../app.ts";

describe("buildApp", () => {
  it("responds ok on /api/health", async () => {
    const app = buildApp({ frontendDistDir: null, assetTreeRoot: "/tmp/unused-in-this-test" });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
