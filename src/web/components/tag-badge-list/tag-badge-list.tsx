import type { JSX } from "react";

import styles from "./tag-badge-list.module.css";

export interface TagBadgeListProps {
  tags: string[];
}

export const TagBadgeList = ({ tags }: TagBadgeListProps): JSX.Element => (
  <div className={styles.list}>
    {tags.map((tag) => (
      <span key={tag} className={styles.chip}>
        {tag}
      </span>
    ))}
  </div>
);
