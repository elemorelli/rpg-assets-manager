import type { OperationScope } from "#utils/operation-scope.ts";

import { requestJson } from "../../http-client.ts";

export type ConversionKind = "image" | "audio";

export interface ConversionCandidate {
  relativePath: string;
  kind: ConversionKind;
  destinationPath: string;
  willOverwrite: boolean;
}

export interface ConversionPlan {
  candidates: ConversionCandidate[];
}

export const fetchConversionPlan = (path: string, scope: OperationScope): Promise<ConversionPlan> =>
  requestJson<ConversionPlan>(
    `/api/convert/plan?path=${encodeURIComponent(path)}&scope=${encodeURIComponent(scope)}`,
  );
