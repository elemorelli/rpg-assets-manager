export interface PreviousAssetSnapshot {
  path: string;
  size: number;
  mtimeMs: number;
  hash: string;
}

export interface WalkedFileInput {
  relativePath: string;
  size: number;
  mtimeMs: number;
}

export interface RescanPlanOptions {
  forceRehash?: boolean;
}

export interface RescanPlan {
  toHash: WalkedFileInput[];
  unchanged: PreviousAssetSnapshot[];
  toRemove: string[];
}

export const computeRescanPlan = (
  previous: PreviousAssetSnapshot[],
  current: WalkedFileInput[],
  options: RescanPlanOptions = {},
): RescanPlan => {
  const previousByPath = new Map(previous.map((asset) => [asset.path, asset]));
  const currentPaths = new Set(current.map((file) => file.relativePath));

  const toHash: WalkedFileInput[] = [];
  const unchanged: PreviousAssetSnapshot[] = [];

  for (const file of current) {
    const previousAsset = previousByPath.get(file.relativePath);

    if (!previousAsset) {
      toHash.push(file);

      continue;
    }

    const hasChanged = previousAsset.size !== file.size || previousAsset.mtimeMs !== file.mtimeMs;

    if (options.forceRehash || hasChanged) {
      toHash.push(file);

      continue;
    }

    unchanged.push(previousAsset);
  }

  const toRemove = previous
    .filter((asset) => !currentPaths.has(asset.path))
    .map((asset) => asset.path);

  return { toHash, unchanged, toRemove };
};
