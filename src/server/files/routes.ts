import fastifyMultipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { createDirectoryHandler } from "./createDirectory/index.ts";
import { deleteEntryHandler } from "./deleteEntry/index.ts";
import { listDirectoryHandler } from "./listDirectory/index.ts";
import { moveEntryHandler } from "./moveEntry/index.ts";
import { rawFileHandler } from "./rawFile/index.ts";
import { renameEntryHandler } from "./renameEntry/index.ts";
import { searchEntriesHandler } from "./searchEntries/index.ts";
import { thumbnailHandler } from "./thumbnail/index.ts";
import { uploadFileHandler } from "./uploadFile/index.ts";

export const registerFileRoutes = (
  app: FastifyInstance,
  assetTreeRoot: string,
  thumbnailCacheDir: string,
): void => {
  app.register(fastifyMultipart);

  app.get("/api/files", listDirectoryHandler(assetTreeRoot));
  app.post("/api/files/mkdir", createDirectoryHandler(assetTreeRoot));
  app.delete("/api/files", deleteEntryHandler(assetTreeRoot));
  app.post("/api/files/rename", renameEntryHandler(assetTreeRoot));
  app.post("/api/files/move", moveEntryHandler(assetTreeRoot));
  app.post("/api/files/upload", uploadFileHandler(assetTreeRoot));
  app.get("/api/files/search", searchEntriesHandler(assetTreeRoot));
  app.get("/api/files/raw", rawFileHandler(assetTreeRoot));
  app.get("/api/files/thumbnail", thumbnailHandler(assetTreeRoot, thumbnailCacheDir));
};
