export const SESSION_COOKIE_NAME = "rpg_assets_session";
export const SESSION_COOKIE_VALUE = "authenticated";

const SECONDS_PER_DAY = 60 * 60 * 24;
const SESSION_COOKIE_MAX_AGE_DAYS = 30;
const SESSION_COOKIE_MAX_AGE_SECONDS = SECONDS_PER_DAY * SESSION_COOKIE_MAX_AGE_DAYS;

interface SessionCookieOptions {
  path: string;
  httpOnly: boolean;
  signed: boolean;
  sameSite: "strict";
  secure: boolean;
  maxAge: number;
}

export const buildSessionCookieOptions = (cookieSecure: boolean): SessionCookieOptions => ({
  path: "/",
  httpOnly: true,
  signed: true,
  sameSite: "strict",
  secure: cookieSecure,
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
});
