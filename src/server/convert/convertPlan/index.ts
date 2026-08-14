import { type ConversionPlan, computeConversionPlan } from "../../../core/conversionPlan.ts";
import { walkAssetTree } from "../../scan/walkAssetTree.ts";

export const getConversionPlan = async (rootDir: string): Promise<ConversionPlan> => {
  const files = await walkAssetTree(rootDir);

  return computeConversionPlan(files);
};

export const convertPlanHandler = (assetTreeRoot: string) => () => getConversionPlan(assetTreeRoot);
