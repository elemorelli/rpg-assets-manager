import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "./db.ts";
import { computeBatchDiff } from "./diff/computeBatchDiff.ts";
import { bootstrapAssets } from "./scan/bootstrapAssets.ts";
import { rescanAssets } from "./scan/rescanAssets.ts";

export interface AppOptions {
  frontendDistDir: string | null;
  assetTreeRoot: string;
}

interface RescanRequestBody {
  forceRehash?: boolean;
}

export const buildApp = ({ frontendDistDir, assetTreeRoot }: AppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post("/api/bootstrap", async () => bootstrapAssets(db, assetTreeRoot));

  app.post("/api/rescan", async (request) => {
    const body = request.body as RescanRequestBody | undefined;

    return rescanAssets(db, assetTreeRoot, { forceRehash: body?.forceRehash ?? false });
  });

  app.get("/api/diff", async () => computeBatchDiff(db));

  if (frontendDistDir) {
    app.register(fastifyStatic, {
      root: path.resolve(frontendDistDir),
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith("/api/")) {
        reply.code(404).send({ error: "not found" });

        return;
      }

      reply.sendFile("index.html");
    });
  }

  return app;
};
