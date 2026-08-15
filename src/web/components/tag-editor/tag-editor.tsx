import { type JSX, type KeyboardEvent, useState } from "react";

import styles from "./tag-editor.module.css";

export interface TagEditorProps {
  entryKey: string;
  tags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
}

export const TagEditor = ({
  entryKey,
  tags,
  availableTags,
  onChange,
}: TagEditorProps): JSX.Element => {
  const [draft, setDraft] = useState<string>("");
  const datalistId = `tag-editor-${entryKey}`;

  const commitDraft = (): void => {
    const candidate = draft.trim();

    if (!candidate || tags.includes(candidate)) {
      setDraft("");

      return;
    }

    onChange([...tags, candidate]);
    setDraft("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
    }
  };

  const handleRemove = (tag: string): void => {
    onChange(tags.filter((existing) => existing !== tag));
  };

  return (
    <div className={styles.editor}>
      {tags.map((tag) => (
        <span key={tag} className={styles.chip}>
          {tag}
          <button
            type="button"
            className={styles.removeButton}
            aria-label={`Remove tag ${tag}`}
            onClick={() => handleRemove(tag)}>
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        list={datalistId}
        value={draft}
        placeholder="Add tag"
        aria-label="Add tag"
        className={styles.input}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
      />
      <datalist id={datalistId}>
        {availableTags.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>
    </div>
  );
};
