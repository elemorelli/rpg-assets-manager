import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "../login.ts";

describe("login", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
