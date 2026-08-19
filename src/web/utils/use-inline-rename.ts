import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { extensionOf } from "#utils/preview.ts";

export interface UseInlineRenameResult {
  isRenaming: boolean;
  renameDraft: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  startRenaming: () => void;
  commitRename: () => void;
  handleRenameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleRenameDraftChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const useInlineRename = (
  name: string,
  onRename: (newName: string) => void,
): UseInlineRenameResult => {
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(name);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = renameInputRef.current;

    if (isRenaming && input) {
      const extension = extensionOf(name);
      const hasExtension = extension.length > 0 && extension.length < name.length;
      const selectionEnd = hasExtension ? name.length - extension.length : name.length;

      input.focus();
      input.setSelectionRange(0, selectionEnd);
    }
  }, [isRenaming, name]);

  const startRenaming = (): void => {
    setRenameDraft(name);
    setIsRenaming(true);
  };

  const commitRename = (): void => {
    const trimmed = renameDraft.trim();

    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }

    setIsRenaming(false);
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitRename();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setIsRenaming(false);
    }
  };

  const handleRenameDraftChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setRenameDraft(event.target.value);
  };

  return {
    isRenaming,
    renameDraft,
    renameInputRef,
    startRenaming,
    commitRename,
    handleRenameKeyDown,
    handleRenameDraftChange,
  };
};
