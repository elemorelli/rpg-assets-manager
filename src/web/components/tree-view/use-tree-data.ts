import { useCallback, useEffect, useRef, useState } from "react";

import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import { buildBreadcrumbs, ROOT_PATH } from "#web/utils/breadcrumbs.ts";

import type { TreeChildrenState } from "./tree-node.tsx";

export interface UseTreeDataResult {
  expandedPaths: Set<string>;
  childrenByPath: Record<string, TreeChildrenState>;
  handleToggle: (path: string) => void;
  handleRetry: (path: string) => void;
}

export const useTreeData = (activePath: string): UseTreeDataResult => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([ROOT_PATH]));
  const [childrenByPath, setChildrenByPath] = useState<Record<string, TreeChildrenState>>({});
  const requestedPathsRef = useRef<Set<string>>(new Set());

  // `requestedPathsRef` tracks in-flight/completed fetches synchronously, so
  // `loadPath` never needs to read `childrenByPath` state to decide whether to
  // fetch: doing that inside a `setState` updater would run the fetch as a
  // side effect of a function React expects to be pure.
  const loadPath = useCallback((path: string): void => {
    requestedPathsRef.current.add(path);
    setChildrenByPath((prev) => ({ ...prev, [path]: "loading" }));

    api
      .listDirectory(path)
      .then((entries) => {
        const directories = entries.filter((entry) => entry.type === "directory");

        setChildrenByPath((prev) => ({ ...prev, [path]: directories }));

        for (const directory of directories) {
          const childPath = joinRelativePath(path, directory.name);

          if (!requestedPathsRef.current.has(childPath)) {
            loadPath(childPath);
          }
        }
      })
      .catch(() => {
        setChildrenByPath((prev) => ({ ...prev, [path]: "error" }));
      });
  }, []);

  useEffect(() => {
    if (!requestedPathsRef.current.has(ROOT_PATH)) {
      loadPath(ROOT_PATH);
    }
  }, [loadPath]);

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
