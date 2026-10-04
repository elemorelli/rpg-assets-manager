import fastifyMultipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";

import { PUBLIC_ROUTE_OPTIONS } from "#server/auth/index.ts";

import { applyBatchHandler } from "./apply/index.ts";
import { loginHandler, logoutHandler, sessionHandler } from "./auth/index.ts";
import { configHandler } from "./config/index.ts";
import { convertAssetsHandler, convertPlanHandler } from "./convert/index.ts";
import { diffHandler } from "./diff/index.ts";
import {
  createDirectoryHandler,
  directoryTreeHandler,
  listDirectoryHandler,
} from "./directories/index.ts";
import {
  deleteEntryHandler,
  downloadZipHandler,
  moveEntryHandler,
  renameEntryHandler,
  searchEntriesHandler,
} from "./entries/index.ts";
import {
  downloadFileHandler,
  filesByTagHandler,
  rawFileHandler,
  setAssetTagsHandler,
  thumbnailHandler,
  uploadFileHandler,
} from "./files/index.ts";
import {
  exportFoundryPlaylistHandler,
  listFoundryPlaylistTagsHandler,
  listFoundryWorldsHandler,
  markFoundryWorldAppliedHandler,
} from "./foundry-worlds/index.ts";
import { cancelJobHandler, jobsStreamHandler } from "./jobs/index.ts";
import { reconcileHandler } from "./reconcile/index.ts";
import { bootstrapHandler, rescanHandler } from "./scan/index.ts";
import { statusHandler } from "./status/index.ts";
import { listTagsHandler } from "./tags/index.ts";
import { youtubeImportHandler, youtubeMetadataHandler } from "./youtube/index.ts";

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
const MAX_UPLOAD_FILE_SIZE_MEGABYTES = 1024;
const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MEGABYTES * BYTES_PER_MEGABYTE;

export const registerRoutes = (
  app: FastifyInstance,
  assetTreeRoot: string,
  thumbnailCacheDir: string,
): void => {
  app.register(fastifyMultipart, { limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES } });

  app.get("/api/status", PUBLIC_ROUTE_OPTIONS, statusHandler);

  app.post("/api/login", PUBLIC_ROUTE_OPTIONS, loginHandler);
  app.post("/api/logout", logoutHandler);
  app.get("/api/session", sessionHandler);
  app.get("/api/config", configHandler);

  app.post("/api/apply", applyBatchHandler(assetTreeRoot));

  app.get("/api/convert/plan", convertPlanHandler(assetTreeRoot));
  app.post("/api/convert", convertAssetsHandler(assetTreeRoot));

  app.get("/api/diff", diffHandler);

  app.get("/api/directories", directoryTreeHandler(assetTreeRoot));
  app.post("/api/directories", createDirectoryHandler(assetTreeRoot));

  app.delete("/api/entries", deleteEntryHandler(assetTreeRoot));
  app.post("/api/entries/rename", renameEntryHandler(assetTreeRoot));
  app.post("/api/entries/move", moveEntryHandler(assetTreeRoot));
  app.get("/api/entries/search", searchEntriesHandler(assetTreeRoot));
  app.get("/api/entries/download-zip", downloadZipHandler(assetTreeRoot));

  app.get("/api/files", listDirectoryHandler(assetTreeRoot));
  app.post("/api/files/upload", uploadFileHandler(assetTreeRoot));
  app.get("/api/files/raw", rawFileHandler(assetTreeRoot));
  app.get("/api/files/download", downloadFileHandler(assetTreeRoot));
  app.get("/api/files/thumbnail", thumbnailHandler(assetTreeRoot, thumbnailCacheDir));
  app.put("/api/files/tags", setAssetTagsHandler(assetTreeRoot));
  app.get("/api/files/by-tag", filesByTagHandler);

  app.get("/api/foundry-worlds", listFoundryWorldsHandler);
  app.post("/api/foundry-worlds/:id/mark-applied", markFoundryWorldAppliedHandler);
  app.get("/api/foundry-worlds/playlists", listFoundryPlaylistTagsHandler);
  app.get("/api/foundry-worlds/playlists/:tag/export", exportFoundryPlaylistHandler);

  app.get("/api/jobs/stream", jobsStreamHandler);
  app.post("/api/jobs/cancel", cancelJobHandler);

  app.post("/api/reconcile", reconcileHandler(assetTreeRoot));

  app.post("/api/bootstrap", bootstrapHandler(assetTreeRoot));
  app.post("/api/rescan", rescanHandler(assetTreeRoot));

  app.get("/api/tags", listTagsHandler);

  app.get("/api/youtube/metadata", youtubeMetadataHandler);
  app.post("/api/youtube/import", youtubeImportHandler(assetTreeRoot));
};
