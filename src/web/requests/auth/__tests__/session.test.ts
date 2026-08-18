import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { checkSession } from "../session.ts";

describe("checkSession", () => {
  it("resolves true when GET /api/session responds ok", async () => {
    stubFetch(new Response(JSON.stringify({})));

    await expect(checkSession()).resolves.toBe(true);
  });

  it("resolves false when GET /api/session responds 401", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        statusText: "Unauthorized",
      }),
    );

    await expect(checkSession()).resolves.toBe(false);
  });

  it("rejects when GET /api/session fails with a non-401 error", async () => {
    stubFetch(
      new Response(JSON.stringify({ error: "boom" }), {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(checkSession()).rejects.toThrow("boom");
  });
});
