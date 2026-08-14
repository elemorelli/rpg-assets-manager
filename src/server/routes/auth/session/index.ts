import type { FastifyReply, FastifyRequest } from "fastify";

export const sessionHandler = async (
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  reply.send({});
};
