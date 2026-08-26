import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPublicAppConfig } from "../config.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadPublicAppConfig", () => {
  it("returns a null base url when ASSETS_PUBLIC_BASE_URL is not set", () => {
    vi.stubEnv("ASSETS_PUBLIC_BASE_URL", "");

    expect(loadPublicAppConfig()).toEqual({ assetsPublicBaseUrl: null });
  });

  it("returns the configured base url when set", () => {
    vi.stubEnv("ASSETS_PUBLIC_BASE_URL", "https://assets.elemorelli.com");

    expect(loadPublicAppConfig()).toEqual({
      assetsPublicBaseUrl: "https://assets.elemorelli.com",
    });
  });
});
