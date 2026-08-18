import clsx from "clsx";
import type { JSX } from "react";

import styles from "./scroll-list.module.css";

export interface ScrollListRow {
  key: string;
  label: string;
  className?: string;
}

export interface ScrollListProps {
  rows: ScrollListRow[];
}

export const ScrollList = ({ rows }: ScrollListProps): JSX.Element => (
  <ul className={styles.list}>
    {rows.map((row) => (
      <li key={row.key} className={clsx(styles.row, row.className)}>
        {row.label}
      </li>
    ))}
  </ul>
);
