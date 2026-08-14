import { jsonInit, requestJson } from "../../http-client.ts";

export const moveEntry = async (fromPath: string, toPath: string): Promise<void> => {
  await requestJson("/api/files/move", jsonInit("POST", { fromPath, toPath }));
};
