import { useCallback, useEffect, useRef, useState } from "react";

import { joinRelativePath } from "#utils/paths.ts";
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
  const requestedPathsRef = useRef<Set<string>>(new Set());
  const previousRefreshTokenRef = useRef<number>(refreshToken);

  // `requestedPathsRef` tracks in-flight/completed fetches synchronously, so
  // `loadPath` never needs to read `childrenByPath` state to decide whether to
  // fetch: doing that inside a `setState` updater would run the fetch as a
  // side effect of a function React expects to be pure.
  //
  // `preloadDepth` bounds how many extra levels get fetched eagerly below
  // `path`, so a folder's children already look populated right when it's
  // expanded. It must stay finite: fetching every descendant unconditionally
  // fanned out into thousands of concurrent requests across the whole tree.
  const PRELOAD_DEPTH_BELOW_EXPANDED_PATH = 1;

  const loadPath = useCallback(
    (path: string, preloadDepth: number = PRELOAD_DEPTH_BELOW_EXPANDED_PATH): void => {
      requestedPathsRef.current.add(path);
      setChildrenByPath((prev) => ({ ...prev, [path]: "loading" }));

      api
        .listDirectory(path)
        .then((entries) => {
          const directories = entries.filter((entry) => entry.type === "directory");

          setChildrenByPath((prev) => ({ ...prev, [path]: directories }));

          if (preloadDepth <= 0) {
            return;
          }

          for (const directory of directories) {
            const childPath = joinRelativePath(path, directory.name);

            if (!requestedPathsRef.current.has(childPath)) {
              loadPath(childPath, preloadDepth - 1);
            }
          }
        })
        .catch(() => {
          setChildrenByPath((prev) => ({ ...prev, [path]: "error" }));
        });
    },
    [],
  );

  useEffect(() => {
    if (!requestedPathsRef.current.has(ROOT_PATH)) {
      loadPath(ROOT_PATH);
    }
  }, [loadPath]);

  // A change elsewhere (sync, rescan, reconcile, convert) can flip a node's
  // hasPendingSync flag or add/remove entries, but this tree only fetches
  // each path once, so it goes stale until told otherwise via this token.
  // Refetch every path already loaded rather than resetting the cache, so
  // expanded nodes stay expanded through the refresh.
  useEffect(() => {
    if (refreshToken === previousRefreshTokenRef.current) {
      return;
    }

    previousRefreshTokenRef.current = refreshToken;

    for (const loadedPath of requestedPathsRef.current) {
      loadPath(loadedPath);
    }
  }, [refreshToken, loadPath]);

  useEffect(() => {
    const ancestorPaths = buildBreadcrumbs(activePath).map((crumb) => crumb.path);

    setExpandedPaths((prev) => {
      const next = new Set(prev);

      for (const ancestorPath of ancestorPaths) {
        next.add(ancestorPath);
      }

      return next;
    });

    for (const ancestorPath of ancestorPaths) {
      if (!requestedPathsRef.current.has(ancestorPath)) {
        loadPath(ancestorPath);
      }
    }
  }, [activePath, loadPath]);

  const handleToggle = (path: string): void => {
    const willExpand = !expandedPaths.has(path);

    setExpandedPaths((prev) => {
      const next = new Set(prev);

      if (willExpand) {
        next.add(path);
      } else {
        next.delete(path);
      }

      return next;
    });

    if (willExpand && !requestedPathsRef.current.has(path)) {
      loadPath(path);
    }
  };

  const handleRetry = (path: string): void => {
    requestedPathsRef.current.delete(path);
    loadPath(path);
  };

  return { expandedPaths, childrenByPath, handleToggle, handleRetry };
};
