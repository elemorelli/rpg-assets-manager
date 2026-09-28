import fastifyCookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#server/errors/index.ts";

import { PUBLIC_ROUTE_OPTIONS } from "../public-route.ts";
import { requireAuthHook } from "../require-auth-hook.ts";

const TEST_COOKIE_SECRET = "public-route-test-secret-at-least-32-chars";

describe("PUBLIC_ROUTE_OPTIONS", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = Fastify();
    app.register(fastifyCookie, { secret: TEST_COOKIE_SECRET });
    app.addHook("onRequest", requireAuthHook);
    app.get("/api/open", PUBLIC_ROUTE_OPTIONS, async () => ({ reached: true }));
    app.get("/api/closed", async () => ({ reached: true }));
  });

  afterEach(async () => {
    await app.close();
  });

  it("lets a route registered with the public options through the auth hook without a session", async () => {
    const response = await app.inject({ url: "/api/open" });

    expect(response.statusCode).toBe(HTTP_STATUS.ok);
    expect(response.json()).toEqual({ reached: true });
  });

  it("keeps the public flag when the path carries a query string", async () => {
    const withQuery = await app.inject({ url: "/api/open?probe=1" });

    expect(withQuery.statusCode).toBe(HTTP_STATUS.ok);
  });

  it("still protects a route registered without the public options", async () => {
    const response = await app.inject({ url: "/api/closed" });

    expect(response.statusCode).toBe(HTTP_STATUS.unauthorized);
  });

  it("still protects an api path that matches no route", async () => {
    const response = await app.inject({ url: "/api/missing" });

    expect(response.statusCode).toBe(HTTP_STATUS.unauthorized);
  });
});
