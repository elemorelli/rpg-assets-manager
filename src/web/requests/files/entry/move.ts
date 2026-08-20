import { jsonInit, requestJson } from "../../http-client.ts";

export const moveEntry = async (
  fromPath: string,
  toPath: string,
  overwrite = false,
): Promise<void> => {
  await requestJson("/api/files/move", jsonInit("POST", { fromPath, toPath, overwrite }));
};
