import { describe, expect, it } from "vitest";

import { buildApp } from "#server/app.ts";
import { HTTP_STATUS } from "#server/errors/index.ts";
import { loginTestSession, TEST_PASSWORD } from "#server/test-utils/login-test-session.ts";

const buildTestApp = () =>
  buildApp({
    webDistDir: null,
    assetTreeRoot: "/tmp/unused-in-this-test",
    thumbnailCacheDir: "/tmp/unused-in-this-test",
  });

describe("authentication", () => {
  it("allows GET /api/health without a session cookie", async () => {
    const app = buildTestApp();

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
  });

  it("rejects a protected route without a session cookie", async () => {
    const app = buildTestApp();

    const response = await app.inject({ method: "GET", url: "/api/session" });

    expect(response.statusCode).toBe(HTTP_STATUS.unauthorized);
  });

  it("rejects POST /api/login with the wrong password", async () => {
    const app = buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/login",
      payload: { password: "wrong-password" },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.unauthorized);
  });

  it("accepts the correct password and grants access to protected routes with the resulting cookie", async () => {
    const app = buildTestApp();
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/session",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
  });

  it("clears the session cookie on POST /api/logout", async () => {
    const app = buildTestApp();
    const sessionCookie = await loginTestSession(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/logout",
      headers: { cookie: sessionCookie },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.headers["set-cookie"]).toContain("rpg_assets_session=;");
  });
});

describe("TEST_PASSWORD sanity check", () => {
  it("matches the hash configured in AUTH_PASSWORD_HASH", async () => {
    const app = buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/login",
      payload: { password: TEST_PASSWORD },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
  });
});
