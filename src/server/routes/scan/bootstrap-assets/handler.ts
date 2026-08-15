import { db } from "#server/db/index.ts";

import { bootstrapAssets } from "./bootstrap.ts";

export const bootstrapHandler = (assetTreeRoot: string) => async () =>
  bootstrapAssets(db, assetTreeRoot);
