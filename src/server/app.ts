import path from "node:path";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";

export interface AppOptions {
  frontendDistDir: string | null;
}

export const buildApp = ({ frontendDistDir }: AppOptions): FastifyInstance => {
  const app = Fastify({ logger: true });

  app.get("/api/health", async () => ({ status: "ok" }));

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
