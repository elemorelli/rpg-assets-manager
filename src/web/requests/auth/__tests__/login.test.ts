import { beforeEach, describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { login } from "../login.ts";

describe("login", () => {
  beforeEach(() => {
    stubFetch(new Response(JSON.stringify({})));
  });

  it("posts the password to /api/login", async () => {
    await login("hunter2");

    expect(fetch).toHaveBeenCalledWith(
      "/api/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "hunter2" }),
      }),
    );
  });
});
