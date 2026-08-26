import { jsonInit, requestJson } from "../http-client.ts";

export const deleteEntry = async (path: string): Promise<void> => {
  await requestJson("/api/entries", jsonInit("DELETE", { path }));
};
