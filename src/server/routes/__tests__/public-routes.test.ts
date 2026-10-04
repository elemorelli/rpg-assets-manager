import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { registerRoutes } from "../index.ts";

const UNUSED_DIR = "/unused";

// Fastify adds a HEAD twin for every GET; only the declared methods matter here.
const AUTO_HEAD_METHOD = "HEAD";

interface RegisteredRoute {
  key: string;
  isPublic: boolean;
}

describe("registerRoutes public routes", () => {
  let app: FastifyInstance;
  let registeredRoutes: RegisteredRoute[];

  beforeEach(async () => {
    registeredRoutes = [];
    app = Fastify();

    app.addHook("onRoute", (routeOptions) => {
      const methods = [routeOptions.method].flat();

      for (const method of methods) {
        if (method === AUTO_HEAD_METHOD) {
          continue;
        }

        registeredRoutes.push({
          key: `${method} ${routeOptions.url}`,
          isPublic: routeOptions.config?.isPublic === true,
        });
      }
    });

    registerRoutes(app, UNUSED_DIR, UNUSED_DIR);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("only exposes status and login without a session", () => {
    const publicRouteKeys = registeredRoutes
      .filter((route) => route.isPublic)
      .map((route) => route.key)
      .sort();

    expect(publicRouteKeys).toEqual(["GET /api/status", "POST /api/login"]);
  });

  it("registers every api route under /api/ so the auth hook guards it", () => {
    const routesOutsideApi = registeredRoutes.filter((route) => !route.key.includes(" /api/"));

    expect(routesOutsideApi).toEqual([]);
  });
});
