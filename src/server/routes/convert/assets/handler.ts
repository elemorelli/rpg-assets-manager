import { runTrackedJob } from "#server/routes/jobs/index.ts";

import { convertAssets } from "./convert-assets.ts";

export const convertAssetsHandler = (assetTreeRoot: string) => async () =>
  runTrackedJob("convert", "converting", "conversion failed", (onProgress) =>
    convertAssets(assetTreeRoot, onProgress),
  );
