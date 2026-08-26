import clsx from "clsx";
import type { JSX } from "react";

import styles from "./diff-filter-chips.module.css";

export interface DiffFilterChipItem<Id extends string = string> {
  id: Id;
  label: string;
  count: number;
  colorClassName?: string;
}

export interface DiffFilterChipsProps<Id extends string = string> {
  items: DiffFilterChipItem<Id>[];
  hiddenIds: ReadonlySet<Id>;
  onToggle: (id: Id) => void;
}

export const DiffFilterChips = <Id extends string = string>({
  items,
  hiddenIds,
  onToggle,
}: DiffFilterChipsProps<Id>): JSX.Element => (
  <div className={styles.chips}>
    {items.map((item) => {
      const isVisible = !hiddenIds.has(item.id);
      const isEmpty = item.count === 0;

      return (
        <button
          key={item.id}
          type="button"
          disabled={isEmpty}
          className={clsx(
            styles.chip,
            item.colorClassName,
            (!isVisible || isEmpty) && styles.chipHidden,
          )}
          aria-pressed={isVisible}
          onClick={() => onToggle(item.id)}>
          {`${item.count} ${item.label}`}
        </button>
      );
    })}
  </div>
);
