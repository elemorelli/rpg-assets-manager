import { jsonInit, requestJson } from "./httpClient.ts";

export const moveEntry = async (fromPath: string, toPath: string): Promise<void> => {
  await requestJson("/api/files/move", jsonInit("POST", { fromPath, toPath }));
};
