import { jsonInit, requestJson } from "../../httpClient.ts";

export const renameEntry = async (path: string, newName: string): Promise<void> => {
  await requestJson("/api/files/rename", jsonInit("POST", { path, newName }));
};
