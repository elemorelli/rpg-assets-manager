import type { CloudflarePurgeConfig } from "./client.ts";

export const assetsPublicBaseUrl: string =
  process.env.ASSETS_PUBLIC_BASE_URL ?? "https://not-configured.invalid";

export const loadCloudflareConfig = (): CloudflarePurgeConfig | null => {
  const zoneId = process.env.CF_ZONE_ID;
  const apiToken = process.env.CF_API_TOKEN;

  return zoneId && apiToken ? { zoneId, apiToken } : null;
};

export const cloudflareConfig: CloudflarePurgeConfig | null = loadCloudflareConfig();
