import clsx from "clsx";
import type { ComponentPropsWithoutRef, JSX } from "react";

import styles from "./segmented-group.module.css";

export interface SegmentedButtonProps extends ComponentPropsWithoutRef<"button"> {
  active?: boolean;
}

export const SegmentedButton = ({
  active,
  className,
  children,
  ...rest
}: SegmentedButtonProps): JSX.Element => (
  <button
    type="button"
    aria-pressed={active}
    className={clsx(styles.button, active && styles.active, className)}
    {...rest}>
    {children}
  </button>
);
