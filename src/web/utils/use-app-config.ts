import { useEffect, useState } from "react";

import type { PublicAppConfig } from "#utils/app-config.ts";
import * as api from "#web/requests/index.ts";

// A context menu renders once per row, and a folder can have hundreds of
// rows, so every consumer sharing one in-flight request (instead of each
// firing its own) keeps opening a large folder from spamming /api/config.
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
        // The public link is an optional convenience; a config fetch
        // failure just means it stays hidden, not that anything breaks.
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
