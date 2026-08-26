import { useCallback, useEffect, useRef, useState } from "react";

import * as api from "#web/requests/index.ts";
import { buildBreadcrumbs, ROOT_PATH } from "#web/utils/breadcrumbs.ts";

import type { TreeChildrenState } from "./tree-view-context.ts";

export interface UseTreeDataResult {
  expandedPaths: Set<string>;
  childrenByPath: Record<string, TreeChildrenState>;
  handleToggle: (path: string) => void;
  handleRetry: (path: string) => void;
}

export const useTreeData = (activePath: string, refreshToken: number): UseTreeDataResult => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([ROOT_PATH]));
  const [childrenByPath, setChildrenByPath] = useState<Record<string, TreeChildrenState>>({});
  const previousRefreshTokenRef = useRef<number>(refreshToken);

  // The tree only needs directory names and pending-sync flags, so it's
  // fetched whole in one lightweight request instead of one call per node:
  // fetching per-node used to fan out into thousands of concurrent requests
  // across the whole asset tree, one per folder.
  const loadTree = useCallback((): void => {
    setChildrenByPath((prev) => ({ ...prev, [ROOT_PATH]: "loading" }));

    api
      .getDirectoryTree()
      .then((tree) => {
        setChildrenByPath(tree);
      })
      .catch(() => {
        setChildrenByPath({ [ROOT_PATH]: "error" });
      });
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // A change elsewhere (sync, rescan, reconcile, convert) can flip a node's
  // hasPendingSync flag or add/remove entries, but the tree is only fetched
  // once, so it goes stale until told otherwise via this token.
  useEffect(() => {
    if (refreshToken === previousRefreshTokenRef.current) {
      return;
    }

    previousRefreshTokenRef.current = refreshToken;
    loadTree();
  }, [refreshToken, loadTree]);

  useEffect(() => {
    const ancestorPaths = buildBreadcrumbs(activePath).map((crumb) => crumb.path);

    setExpandedPaths((prev) => {
      const next = new Set(prev);

      for (const ancestorPath of ancestorPaths) {
        next.add(ancestorPath);
      }

      return next;
    });
  }, [activePath]);

  const handleToggle = (path: string): void => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  };

  const handleRetry = (): void => {
    loadTree();
  };

  return { expandedPaths, childrenByPath, handleToggle, handleRetry };
};
