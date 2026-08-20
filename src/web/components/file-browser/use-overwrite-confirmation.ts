import { useRef, useState } from "react";

export interface OverwriteConfirmationItem {
  displayName: string;
}

export interface UseOverwriteConfirmationResult<T extends OverwriteConfirmationItem> {
  conflictingFileNames: string[] | null;
  askToOverwrite: (items: T[]) => Promise<boolean>;
  confirmOverwrite: () => void;
  cancelOverwrite: () => void;
}

export const useOverwriteConfirmation = <
  T extends OverwriteConfirmationItem,
>(): UseOverwriteConfirmationResult<T> => {
  const [conflictingItems, setConflictingItems] = useState<T[] | null>(null);
  const decisionRef = useRef<((overwrite: boolean) => void) | null>(null);

  const askToOverwrite = (items: T[]): Promise<boolean> =>
    new Promise((resolve) => {
      decisionRef.current = resolve;
      setConflictingItems(items);
    });

  const resolveDecision = (overwrite: boolean): void => {
    decisionRef.current?.(overwrite);
    decisionRef.current = null;
    setConflictingItems(null);
  };

  const confirmOverwrite = (): void => resolveDecision(true);
  const cancelOverwrite = (): void => resolveDecision(false);

  return {
    conflictingFileNames: conflictingItems
      ? conflictingItems.map((item) => item.displayName)
      : null,
    askToOverwrite,
    confirmOverwrite,
    cancelOverwrite,
  };
};
