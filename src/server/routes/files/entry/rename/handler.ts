import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { renameEntry } from "./rename-entry.ts";

interface RenameBody {
  path?: string;
  newName?: string;
}

export const renameEntryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as RenameBody | undefined;

    try {
      await renameEntry(assetTreeRoot, body?.path ?? "", body?.newName ?? "");

      return { renamed: true };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
