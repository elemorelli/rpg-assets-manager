import { assetsPublicBaseUrl } from "#server/cloudflare/index.ts";
import { db } from "#server/db/index.ts";
import { generateMacro } from "#server/routes/apply/macro/generate.ts";
import type { RenamePair } from "#server/routes/diff/index.ts";

import { collapseRenameChain } from "./collapse-rename-chain.ts";

export interface FoundryWorldSummary {
  id: number;
  name: string;
  pendingMacro: string | null;
  pendingRenameCount: number;
}

const fetchPendingRenames = async (acknowledgedAt: Date): Promise<RenamePair[]> => {
  const rows = await db
    .selectFrom("asset_renames")
    .select(["old_path", "new_path"])
    .where("renamed_at", ">", acknowledgedAt)
    .orderBy("renamed_at", "asc")
    .execute();

  return collapseRenameChain(rows.map((row) => ({ oldPath: row.old_path, newPath: row.new_path })));
};

export const listFoundryWorlds = async (baseUrl: string): Promise<FoundryWorldSummary[]> => {
  const worlds = await db
    .selectFrom("foundry_worlds")
    .selectAll()
    .where("active", "=", true)
    .orderBy("name", "asc")
    .execute();

  const summaries: FoundryWorldSummary[] = [];

  for (const world of worlds) {
    const pendingRenames = await fetchPendingRenames(world.acknowledged_at);

    summaries.push({
      id: Number(world.id),
      name: world.name,
      pendingMacro: generateMacro(pendingRenames, baseUrl, [world.name]),
      pendingRenameCount: pendingRenames.length,
    });
  }

  return summaries;
};

export const listFoundryWorldsHandler = async () => listFoundryWorlds(assetsPublicBaseUrl);
