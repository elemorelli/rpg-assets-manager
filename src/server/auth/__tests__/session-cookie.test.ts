import { describe, expect, it } from "vitest";

import { buildSessionCookieOptions } from "../session-cookie.ts";

const SECONDS_PER_DAY = 60 * 60 * 24;
const SESSION_COOKIE_MAX_AGE_DAYS = 30;
const THIRTY_DAYS_IN_SECONDS = SECONDS_PER_DAY * SESSION_COOKIE_MAX_AGE_DAYS;

describe("buildSessionCookieOptions", () => {
  it("builds an httpOnly, signed, strictly-scoped cookie with a 30-day expiry", () => {
    expect(buildSessionCookieOptions(false)).toEqual({
      path: "/",
      httpOnly: true,
      signed: true,
      sameSite: "strict",
      secure: false,
      maxAge: THIRTY_DAYS_IN_SECONDS,
    });
  });

  it("passes the secure flag through", () => {
    expect(buildSessionCookieOptions(true).secure).toBe(true);
  });
});
