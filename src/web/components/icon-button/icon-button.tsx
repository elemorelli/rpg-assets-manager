import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import type { JSX, MouseEventHandler } from "react";

import styles from "./icon-button.module.css";

export interface IconButtonProps {
  icon: IconDefinition;
  label: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  href?: string;
  download?: boolean;
}

export const IconButton = ({
  icon,
  label,
  className,
  onClick,
  href,
  download,
}: IconButtonProps): JSX.Element => {
  const classNames = clsx(styles.iconButton, className);

  if (href) {
    return (
      <a className={classNames} href={href} download={download} aria-label={label} title={label}>
        <FontAwesomeIcon icon={icon} aria-hidden="true" />
      </a>
    );
  }

  return (
    <button type="button" className={classNames} aria-label={label} title={label} onClick={onClick}>
      <FontAwesomeIcon icon={icon} aria-hidden="true" />
    </button>
  );
};
