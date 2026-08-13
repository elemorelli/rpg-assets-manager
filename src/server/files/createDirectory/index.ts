import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { resolveSafeRelativePath } from "../../../core/safePath.ts";
import { respondToHttpError } from "../../errors/index.ts";

export const createDirectory = async (rootDir: string, requestedPath: string): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);
  const absolutePath = path.join(rootDir, relativePath);

  await fs.mkdir(absolutePath, { recursive: false });
};

interface FilesPathBody {
  path?: string;
}

export const createDirectoryHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as FilesPathBody | undefined;

    try {
      await createDirectory(assetTreeRoot, body?.path ?? "");

      return { created: true };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
