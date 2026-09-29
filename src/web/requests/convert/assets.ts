import type { ConversionSummary } from "#utils/conversion.ts";
import type { OperationScope } from "#utils/operation-scope.ts";

import { jsonInit, requestJson } from "../http-client.ts";

export const convert = (path: string, scope: OperationScope): Promise<ConversionSummary> =>
  requestJson<ConversionSummary>("/api/convert", jsonInit("POST", { path, scope }));
