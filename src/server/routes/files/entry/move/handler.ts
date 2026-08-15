import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { moveEntry } from "./move-entry.ts";

interface MoveBody {
  fromPath?: string;
  toPath?: string;
}

export const moveEntryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as MoveBody | undefined;

    try {
      await moveEntry(assetTreeRoot, body?.fromPath ?? "", body?.toPath ?? "");

      return { moved: true };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
