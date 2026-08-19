import { assetsPublicBaseUrl } from "#server/cloudflare/index.ts";
import { db } from "#server/db/index.ts";

import { listFoundryWorlds } from "./list-foundry-worlds.ts";

export const listFoundryWorldsHandler = async () => listFoundryWorlds(db, assetsPublicBaseUrl);
