import send from "@fastify/send";
import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";

import { buildAttachmentDisposition } from "./content-disposition.ts";

const CONTENT_RANGE_HEADER = "Content-Range";

export interface SendAssetFileOptions {
  rootDir: string;
  relativePath: string;
  contentType: string;
  attachmentName?: string;
}

// @fastify/send treats its path as a URL path and percent-decodes it, so literal "%" or "#" in names must be encoded.
const toUrlPath = (relativePath: string): string =>
  relativePath.split("/").map(encodeURIComponent).join("/");

// Streams a file from the asset tree with Range, ETag and Last-Modified support.
export const sendAssetFile = async (
  request: FastifyRequest,
  reply: FastifyReply,
  { rootDir, relativePath, contentType, attachmentName }: SendAssetFileOptions,
): Promise<FastifyReply> => {
  const result = await send(request.raw, toUrlPath(relativePath), {
    root: rootDir,
    dotfiles: "allow",
    index: false,
  });

  if (result.type === "directory") {
    throw new HttpError("Only files can be served", HTTP_STATUS.badRequest);
  }

  if (result.type === "error") {
    const contentRange = result.headers[CONTENT_RANGE_HEADER];

    if (contentRange) {
      reply.header(CONTENT_RANGE_HEADER, contentRange);
    }

    throw new HttpError(result.metadata.error.message, result.statusCode);
  }

  reply.code(result.statusCode);
  reply.headers(result.headers);
  reply.type(contentType);

  if (attachmentName) {
    reply.header("Content-Disposition", buildAttachmentDisposition(attachmentName));
  }

  return reply.send(result.stream);
};
