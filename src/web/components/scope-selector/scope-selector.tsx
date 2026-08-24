import type { JSX } from "react";

import { SegmentedButton } from "#components/segmented-group/segmented-button.tsx";
import { SegmentedGroup } from "#components/segmented-group/segmented-group.tsx";
import type { OperationScope } from "#utils/operation-scope.ts";

import styles from "./scope-selector.module.css";

export interface ScopeSelectorProps {
  scope: OperationScope;
  onScopeChange: (scope: OperationScope) => void;
  directoryLabel: string;
}

interface ScopeOption {
  scope: OperationScope;
  label: string;
  title?: string;
}

export const ScopeSelector = ({
  scope,
  onScopeChange,
  directoryLabel,
}: ScopeSelectorProps): JSX.Element => {
  const options: ScopeOption[] = [
    { scope: "folder", label: "This folder", title: directoryLabel },
    { scope: "subtree", label: "+ Subfolders", title: `${directoryLabel} and its subfolders` },
    { scope: "all", label: "All folders" },
  ];

  return (
    <SegmentedGroup aria-label="Scope" className={styles.group}>
      {options.map((option) => (
        <SegmentedButton
          key={option.scope}
          title={option.title}
          active={scope === option.scope}
          onClick={() => onScopeChange(option.scope)}>
          {option.label}
        </SegmentedButton>
      ))}
    </SegmentedGroup>
  );
};
