import { useCallback, useEffect, useRef, useState } from "react";

import * as api from "#web/requests/index.ts";
import { buildBreadcrumbs, ROOT_PATH } from "#web/utils/breadcrumbs.ts";
import { toggleSetMember } from "#web/utils/toggle-set-member.ts";

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

  // Fetched whole in one request, since per-node fetching fanned out into thousands of requests.
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

  // The tree is fetched once, so changes elsewhere (sync, rescan, convert) refresh it through this token.
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
    setExpandedPaths((prev) => toggleSetMember(prev, path));
  };

  const handleRetry = (): void => {
    loadTree();
  };

  return { expandedPaths, childrenByPath, handleToggle, handleRetry };
};
