import { jsonInit, requestJson } from "../http-client.ts";

export interface ConversionSummary {
  converted: number;
  overwritten: number;
}

export const convert = (path: string): Promise<ConversionSummary> =>
  requestJson<ConversionSummary>("/api/convert", jsonInit("POST", { path }));
