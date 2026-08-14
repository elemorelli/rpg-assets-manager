import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HTTP_STATUS, HttpError, respondToHttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export const deleteEntry = async (rootDir: string, requestedPath: string): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);

  if (relativePath === "") {
    throw new HttpError("Cannot delete the asset tree root", HTTP_STATUS.badRequest);
  }

  const absolutePath = path.join(rootDir, relativePath);

  await fs.rm(absolutePath, { recursive: true, force: false });
};

interface FilesPathBody {
  path?: string;
}

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
