import { jsonInit, requestJson } from "../../http-client.ts";

export const createDirectory = async (path: string): Promise<void> => {
  await requestJson("/api/files/mkdir", jsonInit("POST", { path }));
};
