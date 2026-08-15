import type { FastifyInstance } from "fastify";

export const TEST_PASSWORD = "dev-password";

export const TEST_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$9pbMb6HygHyZQ0FkDfk2Yg$IN/Eu7k4/8RoMontqZFjannreT7hlyuwW7Jm0lUEooQ";

export const loginTestSession = async (app: FastifyInstance): Promise<string> => {
  const response = await app.inject({
    method: "POST",
    url: "/api/login",
    payload: { password: TEST_PASSWORD },
  });

  const setCookieHeader = response.headers["set-cookie"];
  const rawCookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;

  if (!rawCookie) {
    throw new Error(
      "login did not set a session cookie; check setup-test-env.ts installed AUTH_PASSWORD_HASH",
    );
  }

  return rawCookie.split(";")[0];
};
