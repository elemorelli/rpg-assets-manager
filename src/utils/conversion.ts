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

export interface ConversionSummary {
  converted: number;
  overwritten: number;
}
