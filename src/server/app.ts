import path from "node:path";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import { authConfig, requireAuthHook } from "#server/auth/index.ts";
import { HTTP_STATUS } from "./errors/index.ts";
import { registerRoutes } from "./routes/index.ts";

interface AppOptions {
  webDistDir: string | null;
  assetTreeRoot: string;
  thumbnailCacheDir: string;
}

export const buildApp = ({
  webDistDir,
  assetTreeRoot,
  thumbnailCacheDir,
}: AppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });

  app.register(fastifyCookie, { secret: authConfig.sessionSecret });
  app.addHook("onRequest", requireAuthHook);

  registerRoutes(app, assetTreeRoot, thumbnailCacheDir);

  if (webDistDir) {
    app.register(fastifyStatic, {
      root: path.resolve(webDistDir),
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
