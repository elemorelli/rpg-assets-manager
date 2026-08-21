import type { Kysely } from "kysely";

import { assetsPublicBaseUrl } from "#server/cloudflare/index.ts";
import { type DB, db } from "#server/db/index.ts";
import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import { joinUrl } from "#server/utils/url.ts";
import { classifyPreviewKind, extensionOf } from "#utils/preview.ts";

const PLAYLIST_MODE_SHUFFLE = 1; // CONST.PLAYLIST_MODES.SHUFFLE; confirmed against a real Foundry v14 import
const DEFAULT_SOUND_VOLUME = 0.5;
const DEFAULT_SOUND_CHANNEL = "music";

export interface FoundryPlaylistSoundExport {
  name: string;
  path: string;
  channel: string;
  playing: boolean;
  pausedTime: null;
  repeat: boolean;
  volume: number;
  fade: null;
  sort: number;
}

export interface FoundryPlaylistExport {
  name: string;
  description: string;
  sounds: FoundryPlaylistSoundExport[];
  mode: number;
  playing: boolean;
  fade: null;
  folder: null;
  sorting: "a";
  seed: null;
  sort: number;
  ownership: { default: number };
  flags: Record<string, never>;
}

const soundNameFromPath = (assetPath: string): string => {
  const fileName = assetPath.split("/").pop() ?? assetPath;
  const extension = extensionOf(fileName);

  return extension ? fileName.slice(0, -extension.length) : fileName;
};

export const buildFoundryPlaylistExport = (
  tag: string,
  assets: { path: string }[],
  baseUrl: string,
): FoundryPlaylistExport => {
  const sounds: FoundryPlaylistSoundExport[] = assets.map((asset, index) => ({
    name: soundNameFromPath(asset.path),
    path: joinUrl(baseUrl, asset.path),
    channel: DEFAULT_SOUND_CHANNEL,
    playing: false,
    pausedTime: null,
    repeat: false,
    volume: DEFAULT_SOUND_VOLUME,
    fade: null,
    sort: index,
  }));

  return {
    name: tag,
    description: "",
    sounds,
    mode: PLAYLIST_MODE_SHUFFLE,
    playing: false,
    fade: null,
    folder: null,
    sorting: "a",
    seed: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
  };
};

export const sanitizeFilenameSegment = (value: string): string =>
  value.replace(/[^a-zA-Z0-9-_]/g, "-");

export const findAudioAssetsByTag = async (
  db: Kysely<DB>,
  tag: string,
): Promise<{ path: string }[]> => {
  const assets = await db.selectFrom("assets").select(["path", "tags"]).execute();

  const matching = assets.filter(
    (asset) => asset.tags.includes(tag) && classifyPreviewKind(asset.path) === "audio",
  );

  return matching
    .map((asset) => ({ path: asset.path }))
    .sort((a, b) => a.path.localeCompare(b.path));
};

export const exportFoundryPlaylistHandler = withHttpErrorHandling(async (request, reply) => {
  const params = request.params as { tag?: string };
  const tag = params.tag ?? "";
  const assets = await findAudioAssetsByTag(db, tag);

  if (assets.length === 0) {
    throw new HttpError("No audio assets found for this tag", HTTP_STATUS.notFound);
  }

  const playlist = buildFoundryPlaylistExport(tag, assets, assetsPublicBaseUrl);
  const fileName = `foundry-playlist-${sanitizeFilenameSegment(tag)}.json`;

  reply.header("Content-Disposition", `attachment; filename="${fileName}"`);
  reply.type("application/json");

  return playlist;
});
