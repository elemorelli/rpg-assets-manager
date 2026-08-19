import { type DragEvent, type JSX, useState } from "react";

import { buildBreadcrumbs, ROOT_PATH } from "#web/utils/breadcrumbs.ts";

import styles from "./breadcrumbs.module.css";

export interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  canDropOnPath: (path: string) => boolean;
  onDropEntry: (path: string) => void;
}

export const Breadcrumbs = ({
  currentPath,
  onNavigate,
  canDropOnPath,
  onDropEntry,
}: BreadcrumbsProps): JSX.Element => {
  // The app logo/title already links back to root, so it is dropped here to
  // avoid a redundant crumb at the start of every path shown.
  const crumbs = buildBreadcrumbs(currentPath).filter((crumb) => crumb.path !== ROOT_PATH);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  return (
    <nav className={styles.breadcrumbs}>
      <span className={styles.separator} aria-hidden="true">
        /
      </span>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const isDropTarget = canDropOnPath(crumb.path);
        const isDragOver = isDropTarget && dragOverPath === crumb.path;

        const handleDragOver = (event: DragEvent<HTMLButtonElement>): void => {
          if (!isDropTarget) {
            return;
          }

          event.preventDefault();
          setDragOverPath(crumb.path);
        };

        const handleDragLeave = (): void => {
          setDragOverPath((current) => (current === crumb.path ? null : current));
        };

        const handleDrop = (event: DragEvent<HTMLButtonElement>): void => {
          if (!isDropTarget) {
            return;
          }

          event.preventDefault();
          setDragOverPath(null);
          onDropEntry(crumb.path);
        };

        return (
          <span key={crumb.path}>
            <button
              type="button"
              title={crumb.name}
              className={isDragOver ? `${styles.crumb} ${styles.dragOver}` : styles.crumb}
              disabled={isLast}
              onClick={() => onNavigate(crumb.path)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}>
              {crumb.name}
            </button>
            {!isLast && <span className={styles.separator}>/</span>}
          </span>
        );
      })}
    </nav>
  );
};
