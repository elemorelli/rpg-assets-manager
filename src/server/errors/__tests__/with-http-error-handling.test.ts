import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { HttpError } from "../http-error.ts";
import { HTTP_STATUS } from "../http-status.ts";
import { withHttpErrorHandling } from "../with-http-error-handling.ts";

const buildFakeReply = () => {
  const reply = {
    code: vi.fn(),
    send: vi.fn(),
  };

  reply.code.mockReturnValue(reply);

  return reply as unknown as FastifyReply & {
    code: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
};

const fakeRequest = {} as FastifyRequest;

describe("withHttpErrorHandling", () => {
  it("returns the wrapped handler's result on success", async () => {
    const reply = buildFakeReply();
    const wrapped = withHttpErrorHandling(async () => ({ ok: true }));

    const result = await wrapped(fakeRequest, reply);

    expect(result).toEqual({ ok: true });
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("sends the mapped HTTP error and returns undefined when the handler throws", async () => {
    const reply = buildFakeReply();
    const wrapped = withHttpErrorHandling(async () => {
      throw new HttpError("already exists", HTTP_STATUS.conflict);
    });

    const result = await wrapped(fakeRequest, reply);

    expect(result).toBeUndefined();
    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS.conflict);
    expect(reply.send).toHaveBeenCalledWith({ error: "already exists" });
  });

  it("re-throws an error that respondToHttpError does not know how to map", async () => {
    const reply = buildFakeReply();
    const error = new Error("something unexpected");
    const wrapped = withHttpErrorHandling(async () => {
      throw error;
    });

    await expect(wrapped(fakeRequest, reply)).rejects.toThrow(error);
  });
});
