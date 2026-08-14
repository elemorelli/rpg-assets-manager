import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HTTP_STATUS, HttpError, respondToHttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safePath.ts";

export const moveEntry = async (
  rootDir: string,
  fromPath: string,
  toPath: string,
): Promise<void> => {
  const relativeFrom = resolveSafeRelativePath(fromPath);
  const relativeTo = resolveSafeRelativePath(toPath);

  if (relativeFrom === "") {
    throw new HttpError("Cannot move the asset tree root", HTTP_STATUS.badRequest);
  }

  if (relativeTo === "") {
    throw new HttpError("Cannot move onto the asset tree root", HTTP_STATUS.badRequest);
  }

  const absoluteFrom = path.join(rootDir, relativeFrom);
  const absoluteTo = path.join(rootDir, relativeTo);

  const destinationExists = await fs
    .access(absoluteTo)
    .then(() => true)
    .catch(() => false);

  if (destinationExists) {
    throw new HttpError(`Destination already exists: ${relativeTo}`, HTTP_STATUS.conflict);
  }

  await fs.mkdir(path.dirname(absoluteTo), { recursive: true });
  await fs.rename(absoluteFrom, absoluteTo);
};

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
