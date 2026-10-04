import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import { createIncrementalHasher, type IncrementalHasher } from "#server/utils/hash.ts";
import { pathExists } from "#server/utils/path-exists.ts";
import { registerAssetFile } from "#server/utils/register-asset-file.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export type UploadableStream = Readable & { truncated: boolean };

const createHashingTransform = (hasher: IncrementalHasher): Transform =>
  new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hasher.update(chunk);
      callback(null, chunk);
    },
  });

const isFileAlreadyExistsError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "EEXIST";

// Unread multipart bytes left on a keep-alive connection get parsed as the next request, so drain before giving up.
const drainStream = async (stream: UploadableStream): Promise<void> => {
  for await (const _chunk of stream) {
    // discarded
  }
};

export const uploadFile = async (
  rootDir: string,
  targetDirPath: string,
  fileName: string,
  content: UploadableStream,
  overwrite = false,
): Promise<void> => {
  const relativeDir = resolveSafeRelativePath(targetDirPath);
  const relativeFile = resolveSafeRelativePath(path.posix.join(relativeDir, fileName));
  const absolutePath = path.join(rootDir, relativeFile);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  if (!overwrite && (await pathExists(absolutePath))) {
    await drainStream(content);

    throw new HttpError("File already exists", HTTP_STATUS.conflict);
  }

  const hasher = await createIncrementalHasher();

  try {
    await pipeline(
      content,
      createHashingTransform(hasher),
      createWriteStream(absolutePath, { flags: overwrite ? "w" : "wx" }),
    );
  } catch (error) {
    // Covers a file created between the pathExists() check and this write; pipeline() already consumed the stream.
    if (isFileAlreadyExistsError(error)) {
      throw new HttpError("File already exists", HTTP_STATUS.conflict);
    }

    throw error;
  }

  if (content.truncated) {
    await fs.unlink(absolutePath);

    throw new HttpError(
      "Uploaded file exceeds the maximum allowed size",
      HTTP_STATUS.payloadTooLarge,
    );
  }

  const stat = await fs.stat(absolutePath);
  const hash = hasher.digest();

  await registerAssetFile(relativeFile, { size: stat.size, mtime: stat.mtime, hash });
};

interface UploadField {
  type?: string;
  value?: unknown;
}

const extractTargetDir = (fields: Record<string, unknown>): string => {
  const field = fields.path as UploadField | undefined;

  if (!field || typeof field.value !== "string") {
    return "";
  }

  return field.value;
};

const extractOverwrite = (fields: Record<string, unknown>): boolean => {
  const field = fields.overwrite as UploadField | undefined;

  return field?.value === "true";
};

export const uploadFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const uploadedFile = await request.file();

    if (!uploadedFile) {
      reply.code(HTTP_STATUS.badRequest).send({ error: "No file uploaded" });

      return undefined;
    }

    const targetDir = extractTargetDir(uploadedFile.fields);
    const overwrite = extractOverwrite(uploadedFile.fields);

    await uploadFile(assetTreeRoot, targetDir, uploadedFile.filename, uploadedFile.file, overwrite);

    return { uploaded: uploadedFile.filename };
  });
