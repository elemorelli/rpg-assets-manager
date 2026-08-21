import path from "node:path";

import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesScopedPathQuery } from "#server/routes/files/path-body.ts";
import { walkAssetTree } from "#server/routes/scan/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import type { OperationScope } from "#utils/operation-scope.ts";

import { type ConversionPlan, computeConversionPlan } from "./conversion.ts";

export const getConversionPlan = async (
  rootDir: string,
  recursive = true,
): Promise<ConversionPlan> => {
  const files = await walkAssetTree(rootDir, { recursive });

  return computeConversionPlan(files);
};

export const convertPlanHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const query = request.query as FilesScopedPathQuery;
    const relativeDir = resolveSafeRelativePath(query.path ?? "");
    const scope: OperationScope = query.scope ?? "subtree";

    return await getConversionPlan(
      scope === "all" ? assetTreeRoot : path.join(assetTreeRoot, relativeDir),
      scope !== "folder",
    );
  });
