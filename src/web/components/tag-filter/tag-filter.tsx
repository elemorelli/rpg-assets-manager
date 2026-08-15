import type { JSX } from "react";
import styles from "./tag-filter.module.css";

export interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

export const TagFilter = ({
  availableTags,
  selectedTags,
  onToggleTag,
}: TagFilterProps): JSX.Element => {
  return (
    <div className={styles.filter}>
      {availableTags.map((tag) => {
        const isSelected = selectedTags.includes(tag);

        return (
          <button
            key={tag}
            type="button"
            className={isSelected ? styles.chipSelected : styles.chip}
            aria-pressed={isSelected}
            onClick={() => onToggleTag(tag)}>
            {tag}
          </button>
        );
      })}
    </div>
  );
};
