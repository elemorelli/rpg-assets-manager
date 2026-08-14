import { describe, expect, it } from "vitest";
import { validateDryRunGuard } from "../config.ts";

describe("validateDryRunGuard", () => {
  it("does not throw when dry run is enabled, even without cloudflare credentials", () => {
    expect(() => validateDryRunGuard(true, false)).not.toThrow();
  });

  it("does not throw when dry run is disabled and cloudflare credentials are present", () => {
    expect(() => validateDryRunGuard(false, true)).not.toThrow();
  });

  it("throws when dry run is disabled and cloudflare credentials are missing", () => {
    expect(() => validateDryRunGuard(false, false)).toThrow(
      "CF_ZONE_ID and CF_API_TOKEN are required when DRY_RUN is false",
    );
  });
});
