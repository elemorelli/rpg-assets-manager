import clsx from "clsx";
import type { ComponentPropsWithoutRef, JSX } from "react";

import styles from "./menu-list.module.css";

export interface MenuItemProps extends ComponentPropsWithoutRef<"button"> {}

export const MenuItem = ({ className, children, ...rest }: MenuItemProps): JSX.Element => (
  <button type="button" className={clsx(styles.item, className)} {...rest}>
    {children}
  </button>
);
