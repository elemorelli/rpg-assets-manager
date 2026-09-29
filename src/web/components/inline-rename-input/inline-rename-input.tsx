import type { JSX } from "react";

import type { UseInlineRenameResult } from "#web/utils/use-inline-rename.ts";

export type InlineRenameInputProps = Pick<
  UseInlineRenameResult,
  | "renameDraft"
  | "renameInputRef"
  | "commitRename"
  | "handleRenameKeyDown"
  | "handleRenameDraftChange"
> & {
  name: string;
  className?: string;
};

export const InlineRenameInput = ({
  name,
  className,
  renameDraft,
  renameInputRef,
  commitRename,
  handleRenameKeyDown,
  handleRenameDraftChange,
}: InlineRenameInputProps): JSX.Element => (
  <input
    ref={renameInputRef}
    type="text"
    className={className}
    aria-label={`Rename ${name}`}
    value={renameDraft}
    onChange={handleRenameDraftChange}
    onKeyDown={handleRenameKeyDown}
    onBlur={commitRename}
  />
);
