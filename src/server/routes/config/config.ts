import type { PublicAppConfig } from "#utils/app-config.ts";

export const loadPublicAppConfig = (): PublicAppConfig => ({
  assetsPublicBaseUrl: process.env.ASSETS_PUBLIC_BASE_URL || null,
});
