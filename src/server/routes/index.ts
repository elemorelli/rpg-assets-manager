import fastifyMultipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { applyBatchHandler } from "./apply/index.ts";
import { loginHandler, logoutHandler, sessionHandler } from "./auth/index.ts";
import { convertAssetsHandler, convertPlanHandler } from "./convert/index.ts";
import { diffHandler } from "./diff/index.ts";
import {
  createDirectoryHandler,
  deleteEntryHandler,
  listDirectoryHandler,
  moveEntryHandler,
  rawFileHandler,
  renameEntryHandler,
  searchEntriesHandler,
  thumbnailHandler,
  uploadFileHandler,
} from "./files/index.ts";
import { healthHandler } from "./health/index.ts";
import { jobsStreamHandler } from "./jobs/index.ts";
import { reconcileHandler } from "./reconcile/index.ts";
import { bootstrapHandler, rescanHandler } from "./scan/index.ts";
import { acknowledgeWorldHandler, listSyncRunsHandler } from "./sync-runs/index.ts";

export const registerRoutes = (
  app: FastifyInstance,
  assetTreeRoot: string,
  thumbnailCacheDir: string,
): void => {
  app.register(fastifyMultipart);

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
  app.post("/api/sync-runs/:id/world-acknowledgement", acknowledgeWorldHandler);

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
