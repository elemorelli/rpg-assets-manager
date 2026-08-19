import { requestJson } from "../http-client.ts";

export const markFoundryWorldApplied = async (worldId: number): Promise<void> => {
  await requestJson(`/api/foundry-worlds/${worldId}/mark-applied`, { method: "POST" });
};
