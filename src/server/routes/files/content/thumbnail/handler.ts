import fs from "node:fs/promises";

import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";

import { resolveThumbnail } from "./resolve-thumbnail.ts";

export const thumbnailHandler = (assetTreeRoot: string, thumbnailCacheDir: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as FilesPathQuery;
    const cachePath = await resolveThumbnail(assetTreeRoot, thumbnailCacheDir, query.path ?? "");
    const content = await fs.readFile(cachePath);

    reply.type("image/webp");

    return content;
  });
