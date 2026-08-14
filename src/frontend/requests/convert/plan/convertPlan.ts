import { requestJson } from "./httpClient.ts";

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

export const fetchConversionPlan = (): Promise<ConversionPlan> =>
  requestJson<ConversionPlan>("/api/convert/plan");
