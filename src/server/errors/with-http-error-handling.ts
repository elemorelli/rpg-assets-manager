import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "./respond-to-http-error.ts";

export const withHttpErrorHandling =
  <TResult>(handler: (request: FastifyRequest, reply: FastifyReply) => Promise<TResult>) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<TResult | undefined> => {
    try {
      return await handler(request, reply);
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
