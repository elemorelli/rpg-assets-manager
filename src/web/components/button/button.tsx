import clsx from "clsx";
import type { JSX, MouseEventHandler, ReactNode } from "react";

import styles from "./button.module.css";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  children: ReactNode;
  href?: string;
  newTab?: boolean;
}

const DEFAULT_VARIANT: NonNullable<ButtonProps["variant"]> = "secondary";
const DEFAULT_TYPE: NonNullable<ButtonProps["type"]> = "button";

const VARIANT_CLASS_NAMES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
};

export const Button = ({
  variant = DEFAULT_VARIANT,
  type = DEFAULT_TYPE,
  disabled = false,
  onClick,
  className,
  children,
  href,
  newTab,
}: ButtonProps): JSX.Element => {
  const classNames = clsx(styles.button, VARIANT_CLASS_NAMES[variant], className);

  if (href) {
    return (
      <a
        className={classNames}
        href={href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classNames} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
};
