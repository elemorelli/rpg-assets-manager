import type { FormEvent, JSX } from "react";

import styles from "./youtube-import-modal.module.css";

export interface YoutubeUrlStepProps {
  url: string;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
}

export const YoutubeUrlStep = ({
  url,
  onUrlChange,
  onSubmit,
}: YoutubeUrlStepProps): JSX.Element => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className={styles.field} onSubmit={handleSubmit}>
      <label htmlFor="youtube-url-input" className={styles.label}>
        YouTube URL
      </label>
      <input
        id="youtube-url-input"
        type="url"
        className={styles.input}
        value={url}
        placeholder="https://www.youtube.com/watch?v=..."
        onChange={(event) => onUrlChange(event.target.value)}
      />
    </form>
  );
};
