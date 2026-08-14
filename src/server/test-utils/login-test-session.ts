import type { FastifyInstance } from "fastify";

export const TEST_PASSWORD = "dev-password";

export const loginTestSession = async (app: FastifyInstance): Promise<string> => {
  const response = await app.inject({
    method: "POST",
    url: "/api/login",
    payload: { password: TEST_PASSWORD },
  });

  const setCookieHeader = response.headers["set-cookie"];
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;

  if (!rawCookie) {
    throw new Error("login did not set a session cookie; check AUTH_PASSWORD_HASH in .env");
  }

  return rawCookie.split(";")[0];
};
