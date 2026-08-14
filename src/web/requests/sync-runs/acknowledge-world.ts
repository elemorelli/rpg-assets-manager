import { jsonInit, requestJson } from "../http-client.ts";

export const acknowledgeWorld = async (
  syncRunId: number,
  world: string,
  acknowledged: boolean,
): Promise<void> => {
  await requestJson(
    `/api/sync-runs/${syncRunId}/world-acknowledgement`,
    jsonInit("POST", { world, acknowledged }),
  );
};
