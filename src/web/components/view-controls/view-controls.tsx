import {
  faArrowDown,
  faArrowUp,
  faFileLines,
  faFont,
  faList,
  faTableCells,
  faTableList,
  faTag,
  faWeightHanging,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import type { JSX } from "react";

import type { GroupCriterion } from "#web/utils/entry-grouping.ts";
import type { SortCriterion, SortDirection } from "#web/utils/sort-entries.ts";
import type { ViewMode } from "#web/utils/use-view-preferences.ts";

import styles from "./view-controls.module.css";

export interface ViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortCriterion: SortCriterion;
  sortDirection: SortDirection;
  onSortCriterionClick: (criterion: SortCriterion) => void;
  groupCriterion: GroupCriterion;
  onGroupCriterionChange: (criterion: GroupCriterion) => void;
}

interface CriterionButton<TCriterion extends string> {
  criterion: TCriterion;
  label: string;
  icon: IconDefinition;
}

const SORT_CRITERIA: CriterionButton<SortCriterion>[] = [
  { criterion: "name", label: "Sort by name", icon: faFont },
  { criterion: "type", label: "Sort by type", icon: faFileLines },
  { criterion: "size", label: "Sort by size", icon: faWeightHanging },
];

const GROUP_CRITERIA: CriterionButton<GroupCriterion>[] = [
  { criterion: "none", label: "No grouping", icon: faList },
  { criterion: "tag", label: "Group by tag", icon: faTag },
];

export const ViewControls = ({
  viewMode,
  onViewModeChange,
  sortCriterion,
  sortDirection,
  onSortCriterionClick,
  groupCriterion,
  onGroupCriterionChange,
}: ViewControlsProps): JSX.Element => (
  <div className={styles.controls}>
    <div className={styles.group} role="group" aria-label="View">
      <button
        type="button"
        aria-label="Table view"
        title="Table view"
        aria-pressed={viewMode === "table"}
        className={clsx(viewMode === "table" && styles.active)}
        onClick={() => onViewModeChange("table")}>
        <FontAwesomeIcon icon={faTableList} />
      </button>
      <button
        type="button"
        aria-label="Grid view"
        title="Grid view"
        aria-pressed={viewMode === "grid"}
        className={clsx(viewMode === "grid" && styles.active)}
        onClick={() => onViewModeChange("grid")}>
        <FontAwesomeIcon icon={faTableCells} />
      </button>
    </div>
    <div className={styles.group} role="group" aria-label="Sort">
      {SORT_CRITERIA.map(({ criterion, label, icon }) => {
        const isActive = sortCriterion === criterion;

        return (
          <button
            key={criterion}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={isActive}
            className={clsx(isActive && styles.active)}
            onClick={() => onSortCriterionClick(criterion)}>
            <FontAwesomeIcon icon={icon} />
            {isActive && (
              <FontAwesomeIcon
                icon={sortDirection === "asc" ? faArrowUp : faArrowDown}
                className={styles.directionIcon}
                aria-hidden="true"
                data-testid={`sort-direction-icon-${criterion}`}
              />
            )}
          </button>
        );
      })}
    </div>
    <div className={styles.group} role="group" aria-label="Group by">
      {GROUP_CRITERIA.map(({ criterion, label, icon }) => (
        <button
          key={criterion}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={groupCriterion === criterion}
          className={clsx(groupCriterion === criterion && styles.active)}
          onClick={() => onGroupCriterionChange(criterion)}>
          <FontAwesomeIcon icon={icon} />
        </button>
      ))}
    </div>
  </div>
);
