import type { ConversionPlan } from "#utils/conversion.ts";
import type { OperationScope } from "#utils/operation-scope.ts";

import { requestJson } from "../../http-client.ts";

export const fetchConversionPlan = (path: string, scope: OperationScope): Promise<ConversionPlan> =>
  requestJson<ConversionPlan>(
    `/api/convert/plan?path=${encodeURIComponent(path)}&scope=${encodeURIComponent(scope)}`,
  );
