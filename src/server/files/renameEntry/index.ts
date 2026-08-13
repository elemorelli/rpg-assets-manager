import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { resolveSafeRelativePath } from "../../../core/safePath.ts";
import { respondToHttpError } from "../../errors/index.ts";
import { moveEntry } from "../moveEntry/index.ts";

interface RenameBody {
  path?: string;
  newName?: string;
}

export const renameEntryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as RenameBody | undefined;

    try {
      const currentPath = resolveSafeRelativePath(body?.path ?? "");
      const newName = body?.newName ?? "";
      const newPath = path.posix.join(path.posix.dirname(currentPath), newName);

      await moveEntry(assetTreeRoot, currentPath, newPath);

      return { renamed: true };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
