import { requestJson } from "../httpClient.ts";

export interface ConversionSummary {
  converted: number;
  conflicts: number;
}

export const convert = (): Promise<ConversionSummary> =>
  requestJson<ConversionSummary>("/api/convert", { method: "POST" });
