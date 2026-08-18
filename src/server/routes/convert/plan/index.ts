import { walkAssetTree } from "#server/routes/scan/index.ts";

import { type ConversionPlan, computeConversionPlan } from "./conversion.ts";

export const getConversionPlan = async (rootDir: string): Promise<ConversionPlan> => {
  const files = await walkAssetTree(rootDir);

  return computeConversionPlan(files);
};

export const convertPlanHandler = (assetTreeRoot: string) => () => getConversionPlan(assetTreeRoot);
