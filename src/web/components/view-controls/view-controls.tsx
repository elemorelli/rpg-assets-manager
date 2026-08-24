import {
  faArrowDown,
  faArrowUp,
  faFileLines,
  faFont,
  faList,
  faShapes,
  faTableCells,
  faTableList,
  faTag,
  faWeightHanging,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { JSX } from "react";

import { SegmentedButton } from "#components/segmented-group/segmented-button.tsx";
import { SegmentedGroup } from "#components/segmented-group/segmented-group.tsx";
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
  { criterion: "type", label: "Group by type", icon: faShapes },
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
    <SegmentedGroup aria-label="View">
      <SegmentedButton
        aria-label="Table view"
        title="Table view"
        active={viewMode === "table"}
        onClick={() => onViewModeChange("table")}>
        <FontAwesomeIcon icon={faTableList} />
      </SegmentedButton>
      <SegmentedButton
        aria-label="Grid view"
        title="Grid view"
        active={viewMode === "grid"}
        onClick={() => onViewModeChange("grid")}>
        <FontAwesomeIcon icon={faTableCells} />
      </SegmentedButton>
    </SegmentedGroup>
    <SegmentedGroup aria-label="Sort">
      {SORT_CRITERIA.map(({ criterion, label, icon }) => {
        const isActive = sortCriterion === criterion;

        return (
          <SegmentedButton
            key={criterion}
            aria-label={label}
            title={label}
            active={isActive}
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
          </SegmentedButton>
        );
      })}
    </SegmentedGroup>
    <SegmentedGroup aria-label="Group by">
      {GROUP_CRITERIA.map(({ criterion, label, icon }) => (
        <SegmentedButton
          key={criterion}
          aria-label={label}
          title={label}
          active={groupCriterion === criterion}
          onClick={() => onGroupCriterionChange(criterion)}>
          <FontAwesomeIcon icon={icon} />
        </SegmentedButton>
      ))}
    </SegmentedGroup>
  </div>
);
