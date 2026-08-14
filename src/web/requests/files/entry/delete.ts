import { jsonInit, requestJson } from "../../http-client.ts";

export const deleteEntry = async (path: string): Promise<void> => {
  await requestJson("/api/files", jsonInit("DELETE", { path }));
};
