import { requestJson } from "../http-client.ts";

export interface FoundryPlaylistTag {
  tag: string;
  count: number;
}

export const fetchFoundryPlaylistTags = (): Promise<FoundryPlaylistTag[]> =>
  requestJson<FoundryPlaylistTag[]>("/api/foundry-worlds/playlists");
