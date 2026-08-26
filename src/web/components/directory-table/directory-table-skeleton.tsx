import type { JSX } from "react";

import { Skeleton } from "#components/skeleton/skeleton.tsx";

import styles from "./directory-table.module.css";

const SKELETON_ROW_COUNT = 8;
const skeletonRowKeys = Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => index);

export const DirectoryTableSkeleton = (): JSX.Element => (
  <table className={styles.table} aria-busy="true" aria-label="Loading directory contents">
    <thead>
      <tr>
        <th className={styles.preview} aria-label="Preview" />
        <th>Name</th>
        <th className={styles.shrink}>Type</th>
        <th className={styles.shrink}>Size</th>
        <th className={styles.actions} aria-label="Actions" />
      </tr>
    </thead>
    <tbody>
      {skeletonRowKeys.map((key) => (
        <tr key={key}>
          <td className={styles.preview}>
            <Skeleton width="32px" height="32px" />
          </td>
          <td>
            <Skeleton width="60%" height="1em" />
          </td>
          <td className={styles.shrink}>
            <Skeleton width="48px" height="1em" />
          </td>
          <td className={styles.shrink}>
            <Skeleton width="48px" height="1em" />
          </td>
          <td className={styles.actions} />
        </tr>
      ))}
    </tbody>
  </table>
);
