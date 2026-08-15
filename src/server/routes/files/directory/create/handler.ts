import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathBody } from "#server/routes/files/path-body.ts";
import { createDirectory } from "./create-directory.ts";

export const createDirectoryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as FilesPathBody | undefined;

    await createDirectory(assetTreeRoot, body?.path ?? "");

    return { created: true };
  });
