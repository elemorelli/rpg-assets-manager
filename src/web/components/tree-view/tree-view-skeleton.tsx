import type { JSX } from "react";

import { Skeleton } from "#components/skeleton/skeleton.tsx";

import styles from "./tree-view.module.css";

const INDENT_PX = 16;

// Widths and depths just need to look tree-shaped, not match anything real.
const SKELETON_ROWS: { depth: number; width: string }[] = [
  { depth: 0, width: "70%" },
  { depth: 0, width: "50%" },
  { depth: 1, width: "60%" },
  { depth: 1, width: "45%" },
  { depth: 0, width: "65%" },
  { depth: 0, width: "55%" },
];

export const TreeViewSkeleton = (): JSX.Element => (
  <ul className={styles.tree} aria-busy="true" aria-label="Loading directory tree">
    {SKELETON_ROWS.map((row, index) => (
      <li key={index} className={styles.row} style={{ paddingLeft: row.depth * INDENT_PX }}>
        <Skeleton width={row.width} height="1em" />
      </li>
    ))}
  </ul>
);
