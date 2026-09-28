import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "#server/errors/index.ts";

import { SESSION_COOKIE_NAME, SESSION_COOKIE_VALUE } from "./session-cookie.ts";

export const requireAuthHook = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  const requestPath = (request.raw.url ?? "").split("?")[0];
  const isApiRequest = requestPath.startsWith("/api/");
  const isPublicRoute = request.routeOptions.config.isPublic === true;

  if (!isApiRequest || isPublicRoute) {
    return;
  }

  const cookieValue = request.cookies[SESSION_COOKIE_NAME];
  const unsigned = cookieValue ? request.unsignCookie(cookieValue) : undefined;

  if (!unsigned?.valid || unsigned.value !== SESSION_COOKIE_VALUE) {
    reply.code(HTTP_STATUS.unauthorized).send({ error: "unauthorized" });
  }
};
