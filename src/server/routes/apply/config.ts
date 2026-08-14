import { cloudflareConfig } from "../../cloudflare/index.ts";

export const validateDryRunGuard = (dryRun: boolean, hasCloudflareConfig: boolean): void => {
  if (!dryRun && !hasCloudflareConfig) {
    throw new Error("CF_ZONE_ID and CF_API_TOKEN are required when DRY_RUN is false");
  }
};

export const dryRun: boolean = process.env.DRY_RUN !== "false";

validateDryRunGuard(dryRun, cloudflareConfig !== null);
