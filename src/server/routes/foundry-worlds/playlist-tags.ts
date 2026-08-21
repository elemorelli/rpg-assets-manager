import type { Kysely } from "kysely";

import { type DB, db } from "#server/db/index.ts";
import { classifyPreviewKind } from "#utils/preview.ts";

export interface AudioTagCount {
  tag: string;
  count: number;
}

interface TaggedAsset {
  path: string;
  tags: string[];
}

export const computeAudioTagCounts = (assets: TaggedAsset[]): AudioTagCount[] => {
  const countsByTag = new Map<string, number>();

  for (const asset of assets) {
    const isAudio = classifyPreviewKind(asset.path) === "audio";

    if (!isAudio) {
      continue;
    }

    for (const tag of asset.tags) {
      const previousCount = countsByTag.get(tag) ?? 0;

      countsByTag.set(tag, previousCount + 1);
    }
  }

  const counts = [...countsByTag.entries()].map(([tag, count]) => ({ tag, count }));

  return counts.sort((a, b) => a.tag.localeCompare(b.tag));
};

export const listAudioTags = async (db: Kysely<DB>): Promise<AudioTagCount[]> => {
  const assets = await db.selectFrom("assets").select(["path", "tags"]).execute();

  return computeAudioTagCounts(assets);
};

export const listFoundryPlaylistTagsHandler = async (): Promise<AudioTagCount[]> =>
  listAudioTags(db);
