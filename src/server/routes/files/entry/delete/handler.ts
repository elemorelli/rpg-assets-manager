import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import type { FilesPathBody } from "#server/routes/files/path-body.ts";
import { deleteEntry } from "./delete-entry.ts";

export const deleteEntryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as FilesPathBody | undefined;

    try {
      await deleteEntry(assetTreeRoot, body?.path ?? "");

      return { deleted: true };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
