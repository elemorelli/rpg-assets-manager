import clsx from "clsx";
import type { CSSProperties, JSX } from "react";

import styles from "./skeleton.module.css";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton = ({ width, height, className }: SkeletonProps): JSX.Element => {
  const style: CSSProperties = { width, height };

  return <span className={clsx(styles.block, className)} style={style} aria-hidden="true" />;
};
