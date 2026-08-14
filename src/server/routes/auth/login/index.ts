import type { FastifyReply, FastifyRequest } from "fastify";
import {
  authConfig,
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_VALUE,
  verifyPassword,
} from "#server/auth/index.ts";
import { HTTP_STATUS } from "#server/errors/index.ts";

interface LoginBody {
  password?: string;
}

export const loginHandler = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = request.body as LoginBody;
  const password = body?.password ?? "";
  const passwordMatches = await verifyPassword(password, authConfig.passwordHash);

  if (!passwordMatches) {
    reply.code(HTTP_STATUS.unauthorized).send({ error: "unauthorized" });

    return;
  }

  reply
    .setCookie(
      SESSION_COOKIE_NAME,
      SESSION_COOKIE_VALUE,
      buildSessionCookieOptions(authConfig.cookieSecure),
    )
    .send({});
};
