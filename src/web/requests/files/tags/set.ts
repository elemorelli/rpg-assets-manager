import { jsonInit, requestJson } from "../../http-client.ts";

export const setAssetTags = async (path: string, tags: string[]): Promise<string[]> => {
  const response = await requestJson<{ tags: string[] }>(
    "/api/files/tags",
    jsonInit("PUT", { path, tags }),
  );

  return response.tags;
};
