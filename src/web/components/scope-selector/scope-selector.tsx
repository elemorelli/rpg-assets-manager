import clsx from "clsx";
import type { JSX } from "react";

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
}

export const ScopeSelector = ({
  scope,
  onScopeChange,
  directoryLabel,
}: ScopeSelectorProps): JSX.Element => {
  const options: ScopeOption[] = [
    { scope: "folder", label: directoryLabel },
    { scope: "subtree", label: `${directoryLabel} + subfolders` },
    { scope: "all", label: "All folders" },
  ];

  return (
    <div className={styles.group} role="group" aria-label="Scope">
      {options.map((option) => (
        <button
          key={option.scope}
          type="button"
          aria-pressed={scope === option.scope}
          className={clsx(styles.option, scope === option.scope && styles.active)}
          onClick={() => onScopeChange(option.scope)}>
          {option.label}
        </button>
      ))}
    </div>
  );
};
