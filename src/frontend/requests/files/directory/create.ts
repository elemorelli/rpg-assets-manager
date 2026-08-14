import { jsonInit, requestJson } from "../../httpClient.ts";

export const createDirectory = async (path: string): Promise<void> => {
  await requestJson("/api/files/mkdir", jsonInit("POST", { path }));
};
