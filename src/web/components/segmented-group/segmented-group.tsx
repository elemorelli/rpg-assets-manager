import clsx from "clsx";
import type { ComponentPropsWithoutRef, JSX } from "react";

import styles from "./segmented-group.module.css";

export interface SegmentedGroupProps extends ComponentPropsWithoutRef<"div"> {}

export const SegmentedGroup = ({
  className,
  children,
  ...rest
}: SegmentedGroupProps): JSX.Element => (
  <div role="group" className={clsx(styles.group, className)} {...rest}>
    {children}
  </div>
);
