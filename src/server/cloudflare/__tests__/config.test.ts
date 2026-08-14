import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCloudflareConfig } from "../config.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadCloudflareConfig", () => {
  it("returns null when the zone id or api token is missing", () => {
    vi.stubEnv("CF_ZONE_ID", "");
    vi.stubEnv("CF_API_TOKEN", "");

    expect(loadCloudflareConfig()).toBeNull();
  });

  it("returns the config when both the zone id and api token are set", () => {
    vi.stubEnv("CF_ZONE_ID", "zone-1");
    vi.stubEnv("CF_API_TOKEN", "token-1");

    expect(loadCloudflareConfig()).toEqual({ zoneId: "zone-1", apiToken: "token-1" });
  });
});
