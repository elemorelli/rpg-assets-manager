import clsx from "clsx";
import type { JSX } from "react";

import type { DiffRow, DiffRowKind } from "#web/utils/diff-rows.ts";

import styles from "./diff-table.module.css";

export interface DiffTableProps {
  rows: DiffRow[];
  beforeLabel?: string;
  afterLabel?: string;
}

const CONNECTOR_BY_KIND: Record<DiffRowKind, string> = {
  added: "+",
  removed: "–",
  modified: "~",
  renamed: "→",
};

export const DiffTable = ({
  rows,
  beforeLabel = "Before",
  afterLabel = "After",
}: DiffTableProps): JSX.Element => (
  <div className={styles.table}>
    <div className={styles.header}>
      <span className={styles.before}>{beforeLabel}</span>
      <span />
      <span className={styles.after}>{afterLabel}</span>
    </div>
    <div>
      {rows.map((row) => (
        <div key={row.key} className={clsx(styles.row, styles[row.kind])}>
          <span className={styles.before}>{row.before}</span>
          <span className={styles.connector}>{CONNECTOR_BY_KIND[row.kind]}</span>
          <span className={styles.after}>
            {row.after}
            {row.overwrite && <span className={styles.overwriteBadge}>overwrites existing</span>}
          </span>
        </div>
      ))}
    </div>
  </div>
);
