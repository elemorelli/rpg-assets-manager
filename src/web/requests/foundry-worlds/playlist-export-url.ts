export const buildFoundryPlaylistExportUrl = (tag: string): string =>
  `/api/foundry-worlds/playlists/${encodeURIComponent(tag)}/export`;
