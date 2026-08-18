import { requestJson } from "../../http-client.ts";

export type ConversionKind = "image" | "audio";

export interface ConversionCandidate {
  relativePath: string;
  kind: ConversionKind;
  destinationPath: string;
}

export interface ConversionPlan {
  candidates: ConversionCandidate[];
  conflicts: ConversionCandidate[];
}

export const fetchConversionPlan = (path: string): Promise<ConversionPlan> =>
  requestJson<ConversionPlan>(`/api/convert/plan?path=${encodeURIComponent(path)}`);
