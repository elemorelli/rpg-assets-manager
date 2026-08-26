import type { FastifyReply, FastifyRequest } from "fastify";

import { loadPublicAppConfig } from "./config.ts";

export const configHandler = async (
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  reply.send(loadPublicAppConfig());
};
