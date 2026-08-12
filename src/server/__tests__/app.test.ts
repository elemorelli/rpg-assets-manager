import { describe, expect, it } from "vitest";
import { buildApp } from "../app.ts";

describe("buildApp", () => {
  it("responds ok on /api/health", async () => {
    const app = buildApp({ frontendDistDir: null });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });
});
