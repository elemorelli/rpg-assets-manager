import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logout } from "../logout.ts";

describe("logout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts to /api/logout with no body", async () => {
    await logout();

    expect(fetch).toHaveBeenCalledWith("/api/logout", { method: "POST" });
  });
});
