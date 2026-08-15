import type { FastifyReply } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { UnsafePathError } from "#server/utils/safe-path.ts";
import { HttpError } from "../http-error.ts";
import { HTTP_STATUS } from "../http-status.ts";
import { respondToHttpError } from "../respond-to-http-error.ts";

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

describe("respondToHttpError", () => {
  it("maps an UnsafePathError to 400", () => {
    const reply = buildFakeReply();

    respondToHttpError(new UnsafePathError("escaped"), reply);

    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS.badRequest);
    expect(reply.send).toHaveBeenCalledWith({ error: "escaped" });
  });

  it("maps an HttpError to its own status code", () => {
    const reply = buildFakeReply();

    respondToHttpError(new HttpError("already exists", HTTP_STATUS.conflict), reply);

    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS.conflict);
    expect(reply.send).toHaveBeenCalledWith({ error: "already exists" });
  });

  it("maps a Node ENOENT error to 404", () => {
    const reply = buildFakeReply();
    const error = Object.assign(new Error("no such file"), { code: "ENOENT" });

    respondToHttpError(error, reply);

    expect(reply.code).toHaveBeenCalledWith(HTTP_STATUS.notFound);
    expect(reply.send).toHaveBeenCalledWith({ error: "no such file" });
  });

  it("maps Node EEXIST and ENOTEMPTY errors to 409", () => {
    const replyForExist = buildFakeReply();
    const replyForNotEmpty = buildFakeReply();

    respondToHttpError(Object.assign(new Error("exists"), { code: "EEXIST" }), replyForExist);
    respondToHttpError(
      Object.assign(new Error("not empty"), { code: "ENOTEMPTY" }),
      replyForNotEmpty,
    );

    expect(replyForExist.code).toHaveBeenCalledWith(HTTP_STATUS.conflict);
    expect(replyForNotEmpty.code).toHaveBeenCalledWith(HTTP_STATUS.conflict);
  });

  it("re-throws a Node error whose code has no mapping", () => {
    const reply = buildFakeReply();
    const error = Object.assign(new Error("permission denied"), { code: "EACCES" });

    expect(() => respondToHttpError(error, reply)).toThrow(error);
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("re-throws an error that is not a known HTTP or Node error", () => {
    const reply = buildFakeReply();
    const error = new Error("something unexpected");

    expect(() => respondToHttpError(error, reply)).toThrow(error);
    expect(reply.code).not.toHaveBeenCalled();
  });
});
