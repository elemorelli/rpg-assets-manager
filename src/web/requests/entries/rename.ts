import { jsonInit, requestJson } from "../http-client.ts";

export const renameEntry = async (path: string, newName: string): Promise<void> => {
  await requestJson("/api/entries/rename", jsonInit("POST", { path, newName }));
};
