import type { JSX } from "react";

import styles from "./toolbar.module.css";

export interface PendingBadgeProps {
  testId: string;
}

export const PendingBadge = ({ testId }: PendingBadgeProps): JSX.Element => (
  <span className={styles.pendingBadge} data-testid={testId} aria-hidden="true" />
);
