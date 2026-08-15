import { type DragEvent, type JSX, useCallback, useEffect, useRef, useState } from "react";

import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import { buildBreadcrumbs } from "#web/utils/breadcrumbs.ts";

import { type TreeChildrenState, TreeNode } from "./tree-node.tsx";
import styles from "./tree-view.module.css";

export interface TreeViewProps {
  activePath: string;
  onNavigate: (path: string) => void;
  canDropOnPath: (path: string) => boolean;
  onDropEntry: (path: string) => void;
}

const ROOT_PATH = "";

export const TreeView = ({
  activePath,
  onNavigate,
  canDropOnPath,
  onDropEntry,
}: TreeViewProps): JSX.Element => {
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

  const handleRootDragOver = (event: DragEvent<HTMLUListElement>): void => {
    if (!canDropOnPath(ROOT_PATH)) {
      return;
    }

    event.preventDefault();
  };

  const handleRootDrop = (event: DragEvent<HTMLUListElement>): void => {
    if (!canDropOnPath(ROOT_PATH)) {
      return;
    }

    event.preventDefault();
    onDropEntry(ROOT_PATH);
  };

  const rootState = childrenByPath[ROOT_PATH];

  return (
    <ul className={styles.tree} onDragOver={handleRootDragOver} onDrop={handleRootDrop}>
      {rootState === "error" && (
        <li className={styles.error}>
          Failed to load.{" "}
          <button type="button" onClick={() => handleRetry(ROOT_PATH)}>
            Retry
          </button>
        </li>
      )}
      {Array.isArray(rootState) &&
        rootState.map((child) => (
          <TreeNode
            key={child.name}
            path={joinRelativePath(ROOT_PATH, child.name)}
            name={child.name}
            depth={0}
            activePath={activePath}
            expandedPaths={expandedPaths}
            childrenByPath={childrenByPath}
            onToggle={handleToggle}
            onRetry={handleRetry}
            onNavigate={onNavigate}
            canDropOnPath={canDropOnPath}
            onDropEntry={onDropEntry}
          />
        ))}
    </ul>
  );
};
