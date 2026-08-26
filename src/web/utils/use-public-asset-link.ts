import { useEffect, useRef, useState } from "react";

import { joinUrl } from "#utils/url.ts";

import { useAppConfig } from "./use-app-config.ts";

const COPY_FEEDBACK_DURATION_MS = 1500;

export interface UsePublicAssetLinkResult {
  publicAssetUrl: string | null;
  copied: boolean;
  handleCopyLink: () => void;
}

export const usePublicAssetLink = (relativePath: string): UsePublicAssetLinkResult => {
  const appConfig = useAppConfig();
  const publicAssetUrl = appConfig?.assetsPublicBaseUrl
    ? joinUrl(appConfig.assetsPublicBaseUrl, relativePath)
    : null;

  const [copied, setCopied] = useState<boolean>(false);
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyLink = (): void => {
    if (!publicAssetUrl) {
      return;
    }

    void navigator.clipboard.writeText(publicAssetUrl).then(() => {
      setCopied(true);

      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }

      copyResetTimeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, COPY_FEEDBACK_DURATION_MS);
    });
  };

  return { publicAssetUrl, copied, handleCopyLink };
};
