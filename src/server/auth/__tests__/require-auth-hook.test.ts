import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";

import { HTTP_STATUS } from "#server/errors/index.ts";

import { requireAuthHook } from "../require-auth-hook.ts";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_VALUE } from "../session-cookie.ts";

interface FakeRequestOptions {
  url: string;
  cookieValue?: string;
  unsignResult?: { valid: boolean; value?: string };
}

const createFakeRequest = ({
  url,
  cookieValue,
  unsignResult,
}: FakeRequestOptions): FastifyRequest =>
  ({
    raw: { url },
    cookies: cookieValue ? { [SESSION_COOKIE_NAME]: cookieValue } : {},
    unsignCookie: vi.fn().mockReturnValue(unsignResult),
  }) as unknown as FastifyRequest;

const createFakeReply = (): FastifyReply & { code: ReturnType<typeof vi.fn> } => {
  const reply = {
    code: vi.fn(),
    send: vi.fn(),
  };

  reply.code.mockReturnValue(reply);

  return reply as unknown as FastifyReply & { code: ReturnType<typeof vi.fn> };
};

describe("requireAuthHook", () => {
  it("allows GET /api/health without a session cookie", async () => {
    const request = createFakeRequest({ url: "/api/health" });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  it("allows /api/health with a query string, since the path is matched before the '?'", async () => {
    const request = createFakeRequest({ url: "/api/health?foo=1" });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  it("allows POST /api/login without a session cookie", async () => {
    const request = createFakeRequest({ url: "/api/login" });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  it("allows a non-api path through without checking cookies", async () => {
    const request = createFakeRequest({ url: "/index.html" });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
  });

  it("rejects a protected route with no session cookie", async () => {
    const request = createFakeRequest({ url: "/api/session" });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS.unauthorized);
    expect(reply.send).toHaveBeenCalledWith({ error: "unauthorized" });
  });

  it("rejects a protected route when the cookie signature is invalid", async () => {
    const request = createFakeRequest({
      url: "/api/session",
      cookieValue: "tampered",
      unsignResult: { valid: false },
    });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS.unauthorized);
  });

  it("rejects a protected route when the cookie is validly signed but carries the wrong value", async () => {
    const request = createFakeRequest({
      url: "/api/session",
      cookieValue: "signed-but-wrong",
      unsignResult: { valid: true, value: "not-authenticated" },
    });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS.unauthorized);
  });

  it("allows a protected route when the cookie is validly signed with the expected value", async () => {
    const request = createFakeRequest({
      url: "/api/session",
      cookieValue: "signed-and-valid",
      unsignResult: { valid: true, value: SESSION_COOKIE_VALUE },
    });
    const reply = createFakeReply();

    await requireAuthHook(request, reply);

    expect(reply.code).not.toHaveBeenCalled();
  });
});
