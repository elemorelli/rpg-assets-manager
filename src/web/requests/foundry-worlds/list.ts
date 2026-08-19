import { requestJson } from "../http-client.ts";

export interface FoundryWorld {
  id: number;
  name: string;
  pendingMacro: string | null;
  pendingRenameCount: number;
}

export const fetchFoundryWorlds = (): Promise<FoundryWorld[]> =>
  requestJson<FoundryWorld[]>("/api/foundry-worlds");
