import { chunkArray } from "./chunk-array.ts";

const CLOUDFLARE_PURGE_BATCH_SIZE = 30;

export interface CloudflarePurgeConfig {
  zoneId: string;
  apiToken: string;
}

export const purgeCloudflareCache = async (
  urls: string[],
  config: CloudflarePurgeConfig,
): Promise<void> => {
  const batches = chunkArray(urls, CLOUDFLARE_PURGE_BATCH_SIZE);

  for (const batch of batches) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: batch }),
      },
    );

    if (!response.ok) {
      throw new Error(`Cloudflare purge failed with status ${response.status}`);
    }
  }
};
