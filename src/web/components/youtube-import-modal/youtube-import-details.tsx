import type { JSX } from "react";

import { TagEditor } from "#components/tag-editor/tag-editor.tsx";
import { IMPORT_FILE_EXTENSION, type YoutubeMetadata } from "#utils/youtube-import.ts";
import { formatDuration } from "#web/utils/format-duration.ts";

import styles from "./youtube-import-modal.module.css";

export interface YoutubeImportDetailsProps {
  metadata: YoutubeMetadata;
  fileName: string;
  fileNameError: string | null;
  onFileNameChange: (fileName: string) => void;
  tags: string[];
  availableTags: string[];
  onTagsChange: (tags: string[]) => void;
  destinationLabel: string;
}

export const YoutubeImportDetails = ({
  metadata,
  fileName,
  fileNameError,
  onFileNameChange,
  tags,
  availableTags,
  onTagsChange,
  destinationLabel,
}: YoutubeImportDetailsProps): JSX.Element => (
  <div className={styles.details}>
    <div>
      <p className={styles.videoTitle}>{metadata.title}</p>
      <p className={styles.muted}>{formatDuration(metadata.durationSeconds)}</p>
    </div>
    <div className={styles.field}>
      <label htmlFor="youtube-file-name-input" className={styles.label}>
        File name
      </label>
      <div className={styles.fileNameRow}>
        <input
          id="youtube-file-name-input"
          type="text"
          className={styles.input}
          value={fileName}
          onChange={(event) => onFileNameChange(event.target.value)}
        />
        <span className={styles.muted}>{IMPORT_FILE_EXTENSION}</span>
      </div>
      {fileNameError !== null && <p className={styles.fieldError}>{fileNameError}</p>}
    </div>
    <div className={styles.field}>
      <span className={styles.label}>Tags</span>
      <TagEditor
        entryKey={`youtube-${metadata.videoId}`}
        tags={tags}
        availableTags={availableTags}
        onChange={onTagsChange}
      />
    </div>
    <p className={styles.muted}>{`Destination: ${destinationLabel}`}</p>
  </div>
);
