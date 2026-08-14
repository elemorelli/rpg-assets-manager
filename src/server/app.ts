import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { HTTP_STATUS } from "./errors/index.ts";
import { registerRoutes } from "./routes/index.ts";

export interface AppOptions {
  frontendDistDir: string | null;
  assetTreeRoot: string;
  thumbnailCacheDir: string;
}

export const buildApp = ({
  frontendDistDir,
  assetTreeRoot,
  thumbnailCacheDir,
}: AppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });

  registerRoutes(app, assetTreeRoot, thumbnailCacheDir);

  if (frontendDistDir) {
    app.register(fastifyStatic, {
      root: path.resolve(frontendDistDir),
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith("/api/")) {
        reply.code(HTTP_STATUS.notFound).send({ error: "not found" });

        return;
      }

      reply.sendFile("index.html");
    });
  }

  return app;
};
