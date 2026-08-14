import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HTTP_STATUS, respondToHttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export const uploadFile = async (
  rootDir: string,
  targetDirPath: string,
  fileName: string,
  content: Buffer,
): Promise<void> => {
  const relativeDir = resolveSafeRelativePath(targetDirPath);
  const relativeFile = resolveSafeRelativePath(path.posix.join(relativeDir, fileName));
  const absolutePath = path.join(rootDir, relativeFile);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, { flag: "wx" });
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

export const uploadFileHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const uploadedFile = await request.file();

      if (!uploadedFile) {
        reply.code(HTTP_STATUS.badRequest).send({ error: "No file uploaded" });

        return undefined;
      }

      const targetDir = extractTargetDir(uploadedFile.fields);
      const content = await uploadedFile.toBuffer();

      await uploadFile(assetTreeRoot, targetDir, uploadedFile.filename, content);

      return { uploaded: uploadedFile.filename };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
