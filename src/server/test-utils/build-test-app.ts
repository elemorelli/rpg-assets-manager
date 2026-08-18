import path from "node:path";
import type { FastifyInstance } from "fastify";

import { buildApp } from "#server/app.ts";

import type { TempDirHandle } from "./integration-lifecycle.ts";

export const buildTestApp = (tempDir: TempDirHandle): FastifyInstance =>
  buildApp({
    webDistDir: null,
    assetTreeRoot: tempDir.path,
    thumbnailCacheDir: path.join(tempDir.path, "thumbnails"),
  });
