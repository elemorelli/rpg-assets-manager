import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { moveEntry } from "../move/index.ts";

export const renameEntry = async (
  rootDir: string,
  requestedPath: string,
  newName: string,
): Promise<void> => {
  const currentPath = resolveSafeRelativePath(requestedPath);
  const newPath = path.posix.join(path.posix.dirname(currentPath), newName);

  await moveEntry(rootDir, currentPath, newPath);
};

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
