import { useEffect, useState } from "react";

import type { PublicAppConfig } from "#utils/app-config.ts";
import * as api from "#web/requests/index.ts";

// Shared across consumers, so a folder with hundreds of context menus sends one /api/config request.
let cachedConfigPromise: Promise<PublicAppConfig> | null = null;

const loadAppConfig = (): Promise<PublicAppConfig> => {
  if (!cachedConfigPromise) {
    cachedConfigPromise = api.fetchAppConfig();
  }

  return cachedConfigPromise;
};

export const useAppConfig = (): PublicAppConfig | null => {
  const [config, setConfig] = useState<PublicAppConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadAppConfig()
      .then((result) => {
        if (!cancelled) {
          setConfig(result);
        }
      })
      .catch(() => {
        // The public link is optional, so a failed config fetch just keeps it hidden.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return config;
};

export const __resetAppConfigCacheForTests = (): void => {
  cachedConfigPromise = null;
};
