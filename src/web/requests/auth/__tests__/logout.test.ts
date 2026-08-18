import { beforeEach, describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { logout } from "../logout.ts";

describe("logout", () => {
  beforeEach(() => {
    stubFetch(new Response(JSON.stringify({})));
  });

  it("posts to /api/logout with no body", async () => {
    await logout();

    expect(fetch).toHaveBeenCalledWith("/api/logout", { method: "POST" });
  });
});
