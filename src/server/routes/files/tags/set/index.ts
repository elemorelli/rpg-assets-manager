import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError, respondToHttpError } from "#server/errors/index.ts";
import { hashBuffer } from "#server/utils/hash.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { normalizeTags } from "#server/utils/tags.ts";

export const setAssetTags = async (
  rootDir: string,
  requestedPath: string,
  rawTags: string[],
): Promise<string[]> => {
  const relativePath = resolveSafeRelativePath(requestedPath);

  if (relativePath === "") {
    throw new HttpError("Cannot tag the asset tree root", HTTP_STATUS.badRequest);
  }

  const tags = normalizeTags(rawTags);

  const existing = await db
    .selectFrom("assets")
    .select("id")
    .where("path", "=", relativePath)
    .executeTakeFirst();

  if (existing) {
    await db.updateTable("assets").set({ tags }).where("path", "=", relativePath).execute();

    return tags;
  }

  const absolutePath = path.join(rootDir, relativePath);
  const stat = await fs.stat(absolutePath);

  if (stat.isDirectory()) {
    throw new HttpError("Cannot tag a directory", HTTP_STATUS.badRequest);
  }

  const content = await fs.readFile(absolutePath);
  const hash = await hashBuffer(content);

  await db
    .insertInto("assets")
    .values({ path: relativePath, size: stat.size, mtime: new Date(stat.mtimeMs), hash, tags })
    .onConflict((oc) => oc.column("path").doUpdateSet({ tags }))
    .execute();

  return tags;
};

interface SetTagsBody {
  path?: string;
  tags?: string[];
}

export const setAssetTagsHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as SetTagsBody | undefined;

    try {
      const tags = await setAssetTags(assetTreeRoot, body?.path ?? "", body?.tags ?? []);

      return { tags };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
