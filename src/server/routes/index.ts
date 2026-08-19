import fastifyMultipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";

import { applyBatchHandler } from "./apply/index.ts";
import { loginHandler, logoutHandler, sessionHandler } from "./auth/index.ts";
import { convertAssetsHandler, convertPlanHandler } from "./convert/index.ts";
import { diffHandler } from "./diff/index.ts";
import {
  createDirectoryHandler,
  deleteEntryHandler,
  filesByTagHandler,
  listDirectoryHandler,
  moveEntryHandler,
  rawFileHandler,
  renameEntryHandler,
  searchEntriesHandler,
  setAssetTagsHandler,
  thumbnailHandler,
  uploadFileHandler,
} from "./files/index.ts";
import {
  listFoundryWorldsHandler,
  markFoundryWorldAppliedHandler,
} from "./foundry-worlds/index.ts";
import { healthHandler } from "./health/index.ts";
import { jobsStreamHandler } from "./jobs/index.ts";
import { reconcileHandler } from "./reconcile/index.ts";
import { bootstrapHandler, rescanHandler } from "./scan/index.ts";
import { listSyncRunsHandler } from "./sync-runs/index.ts";
import { listTagsHandler } from "./tags/index.ts";

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

  app.get("/api/health", healthHandler);
  app.post("/api/login", loginHandler);
  app.post("/api/logout", logoutHandler);
  app.get("/api/session", sessionHandler);
  app.post("/api/bootstrap", bootstrapHandler(assetTreeRoot));
  app.post("/api/rescan", rescanHandler(assetTreeRoot));
  app.post("/api/reconcile", reconcileHandler(assetTreeRoot));
  app.get("/api/diff", diffHandler);
  app.get("/api/jobs/stream", jobsStreamHandler);
  app.get("/api/convert/plan", convertPlanHandler(assetTreeRoot));
  app.post("/api/convert", convertAssetsHandler(assetTreeRoot));
  app.post("/api/apply", applyBatchHandler(assetTreeRoot));
  app.get("/api/sync-runs", listSyncRunsHandler);
  app.get("/api/foundry-worlds", listFoundryWorldsHandler);
  app.post("/api/foundry-worlds/:id/mark-applied", markFoundryWorldAppliedHandler);

  app.get("/api/files", listDirectoryHandler(assetTreeRoot));
  app.post("/api/files/mkdir", createDirectoryHandler(assetTreeRoot));
  app.delete("/api/files", deleteEntryHandler(assetTreeRoot));
  app.post("/api/files/rename", renameEntryHandler(assetTreeRoot));
  app.post("/api/files/move", moveEntryHandler(assetTreeRoot));
  app.post("/api/files/upload", uploadFileHandler(assetTreeRoot));
  app.get("/api/files/search", searchEntriesHandler(assetTreeRoot));
  app.get("/api/files/raw", rawFileHandler(assetTreeRoot));
  app.get("/api/files/thumbnail", thumbnailHandler(assetTreeRoot, thumbnailCacheDir));
  app.put("/api/files/tags", setAssetTagsHandler(assetTreeRoot));
  app.get("/api/files/by-tag", filesByTagHandler);
  app.get("/api/tags", listTagsHandler);
};
