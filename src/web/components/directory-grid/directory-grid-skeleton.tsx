import type { JSX } from "react";

import { Skeleton } from "#components/skeleton/skeleton.tsx";

import styles from "./directory-grid.module.css";

const SKELETON_TILE_COUNT = 12;
const skeletonTileKeys = Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => index);

export const DirectoryGridSkeleton = (): JSX.Element => (
  <div className={styles.grid} aria-busy="true" aria-label="Loading directory contents">
    {skeletonTileKeys.map((key) => (
      <div className={styles.tile} key={key}>
        <Skeleton width="100%" height="96px" />
        <Skeleton width="80%" height="1em" />
      </div>
    ))}
  </div>
);
