import type { JSX } from "react";
import { buildBreadcrumbs } from "../../../core/breadcrumbs.ts";
import styles from "./Breadcrumbs.module.css";

export interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Breadcrumbs = ({ currentPath, onNavigate }: BreadcrumbsProps): JSX.Element => {
  const crumbs = buildBreadcrumbs(currentPath);

  return (
    <nav className={styles.breadcrumbs}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;

        return (
          <span key={crumb.path}>
            <button
              type="button"
              className={styles.crumb}
              disabled={isLast}
              onClick={() => onNavigate(crumb.path)}>
              {crumb.name}
            </button>
            {!isLast && <span className={styles.separator}>/</span>}
          </span>
        );
      })}
    </nav>
  );
};
