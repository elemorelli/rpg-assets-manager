import clsx from "clsx";
import type { ComponentPropsWithoutRef, JSX } from "react";

import styles from "./menu-list.module.css";

export interface MenuListProps extends ComponentPropsWithoutRef<"div"> {}

export const MenuList = ({ className, children, ...rest }: MenuListProps): JSX.Element => (
  <div className={clsx(styles.list, className)} {...rest}>
    {children}
  </div>
);
