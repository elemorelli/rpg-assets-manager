import { describe, expect, it } from "vitest";
import { resolveAuthConfig } from "../config.ts";

describe("resolveAuthConfig", () => {
  it("returns the config when both required values are present", () => {
    const config = resolveAuthConfig({
      AUTH_PASSWORD_HASH: "hash",
      AUTH_SESSION_SECRET: "secret",
    });

    expect(config).toEqual({ passwordHash: "hash", sessionSecret: "secret", cookieSecure: false });
  });

  it("enables cookieSecure when AUTH_COOKIE_SECURE is 'true'", () => {
    const config = resolveAuthConfig({
      AUTH_PASSWORD_HASH: "hash",
      AUTH_SESSION_SECRET: "secret",
      AUTH_COOKIE_SECURE: "true",
    });

    expect(config.cookieSecure).toBe(true);
  });

  it("throws when AUTH_PASSWORD_HASH is missing", () => {
    expect(() => resolveAuthConfig({ AUTH_SESSION_SECRET: "secret" })).toThrow(
      "AUTH_PASSWORD_HASH is not set",
    );
  });

  it("throws when AUTH_SESSION_SECRET is missing", () => {
    expect(() => resolveAuthConfig({ AUTH_PASSWORD_HASH: "hash" })).toThrow(
      "AUTH_SESSION_SECRET is not set",
    );
  });
});
