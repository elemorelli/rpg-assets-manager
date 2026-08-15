import { afterEach, describe, expect, it, vi } from "vitest";

import { checkSession } from "../session.ts";

describe("checkSession", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves true when GET /api/session responds ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    await expect(checkSession()).resolves.toBe(true);
  });

  it("resolves false when GET /api/session responds 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({ error: "unauthorized" }),
      }),
    );

    await expect(checkSession()).resolves.toBe(false);
  });

  it("rejects when GET /api/session fails with a non-401 error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "boom" }),
      }),
    );

    await expect(checkSession()).rejects.toThrow("boom");
  });
});
