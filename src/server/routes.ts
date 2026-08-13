import type { FastifyInstance } from "fastify";
import { diffHandler } from "./diff/index.ts";
import { healthHandler } from "./health/index.ts";
import { bootstrapHandler } from "./scan/bootstrapAssets/index.ts";
import { rescanHandler } from "./scan/rescanAssets/index.ts";

export const registerCoreRoutes = (app: FastifyInstance, assetTreeRoot: string): void => {
  app.get("/api/health", healthHandler);
  app.post("/api/bootstrap", bootstrapHandler(assetTreeRoot));
  app.post("/api/rescan", rescanHandler(assetTreeRoot));
  app.get("/api/diff", diffHandler);
};
