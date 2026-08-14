import { jsonInit, requestJson } from "../../http-client.ts";

export const renameEntry = async (path: string, newName: string): Promise<void> => {
  await requestJson("/api/files/rename", jsonInit("POST", { path, newName }));
};
