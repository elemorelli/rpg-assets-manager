import type { FastifyReply, FastifyRequest } from "fastify";
import { SESSION_COOKIE_NAME } from "#server/auth/index.ts";

export const logoutHandler = async (
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" }).send({});
};
