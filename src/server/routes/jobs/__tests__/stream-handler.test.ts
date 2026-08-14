import { EventEmitter } from "node:events";
import type { FastifyReply, FastifyRequest } from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setCurrentJob } from "../job-store.ts";
import { jobsStreamHandler } from "../stream-handler.ts";

const createRequest = (): FastifyRequest & { raw: EventEmitter } => {
  const raw = new EventEmitter();

  return { raw } as unknown as FastifyRequest & { raw: EventEmitter };
};

const createReply = (): FastifyReply & { chunks: string[] } => {
  const chunks: string[] = [];
  const raw = {
    writeHead: vi.fn(),
    write: (chunk: string) => {
      chunks.push(chunk);

      return true;
    },
  };

  return { raw, hijack: vi.fn(), chunks } as unknown as FastifyReply & { chunks: string[] };
};

describe("jobsStreamHandler", () => {
  beforeEach(() => {
    setCurrentJob(null);
  });

  it("writes the current job state immediately on connect", () => {
    const request = createRequest();
    const reply = createReply();

    jobsStreamHandler(request, reply);

    expect(reply.chunks).toEqual(["data: null\n\n"]);
  });

  it("writes subsequent job updates as they happen", () => {
    const request = createRequest();
    const reply = createReply();

    jobsStreamHandler(request, reply);
    setCurrentJob({ type: "rescan", stage: "hashing", done: 1, total: 10, error: null });

    expect(reply.chunks).toEqual([
      "data: null\n\n",
      'data: {"type":"rescan","stage":"hashing","done":1,"total":10,"error":null}\n\n',
    ]);
  });

  it("stops writing once the request closes", () => {
    const request = createRequest();
    const reply = createReply();

    jobsStreamHandler(request, reply);
    request.raw.emit("close");
    setCurrentJob({ type: "rescan", stage: "hashing", done: 1, total: 10, error: null });

    expect(reply.chunks).toEqual(["data: null\n\n"]);
  });

  it("hijacks the reply so Fastify does not also try to send a response", () => {
    const request = createRequest();
    const reply = createReply();

    jobsStreamHandler(request, reply);

    expect(reply.hijack).toHaveBeenCalled();
  });
});
