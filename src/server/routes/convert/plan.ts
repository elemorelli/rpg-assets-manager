import path from "node:path";

import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathQuery } from "#server/routes/files/path-body.ts";
import { walkAssetTree } from "#server/routes/scan/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

import { type ConversionPlan, computeConversionPlan } from "./conversion.ts";

export const getConversionPlan = async (rootDir: string): Promise<ConversionPlan> => {
  const files = await walkAssetTree(rootDir);

  return computeConversionPlan(files);
};

export const convertPlanHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const query = request.query as FilesPathQuery;
    const relativeDir = resolveSafeRelativePath(query.path ?? "");

    return await getConversionPlan(path.join(assetTreeRoot, relativeDir));
  });
