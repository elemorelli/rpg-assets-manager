import clsx from "clsx";
import type { ComponentPropsWithoutRef, JSX, Ref } from "react";

import styles from "./panel.module.css";

export interface PanelProps extends Omit<ComponentPropsWithoutRef<"div">, "className"> {
  elevated?: boolean;
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

export const Panel = ({
  elevated = false,
  className,
  children,
  ref,
  ...rest
}: PanelProps): JSX.Element => {
  const classNames = clsx(styles.panel, elevated && styles.elevated, className);

  return (
    <div ref={ref} className={classNames} {...rest}>
      {children}
    </div>
  );
};
