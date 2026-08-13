import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "./db.ts";
import { bootstrapAssets } from "./scan/bootstrapAssets.ts";

export interface AppOptions {
  frontendDistDir: string | null;
  assetTreeRoot: string;
}

export const buildApp = ({ frontendDistDir, assetTreeRoot }: AppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });

  app.get("/api/health", async () => ({ status: "ok" }));

  app.post("/api/bootstrap", async () => bootstrapAssets(db, assetTreeRoot));

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
