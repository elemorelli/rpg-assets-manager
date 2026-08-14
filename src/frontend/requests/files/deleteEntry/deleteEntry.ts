import { jsonInit, requestJson } from "./httpClient.ts";

export const deleteEntry = async (path: string): Promise<void> => {
  await requestJson("/api/files", jsonInit("DELETE", { path }));
};
