import clsx from "clsx";
import type { ComponentPropsWithoutRef, JSX } from "react";

import styles from "./panel.module.css";

export interface PanelProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  elevated?: boolean;
  className?: string;
}

export const Panel = ({
  elevated = false,
  className,
  children,
  ...rest
}: PanelProps): JSX.Element => {
  const classNames = clsx(styles.panel, elevated && styles.elevated, className);

  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  );
};
