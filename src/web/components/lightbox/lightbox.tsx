import { faChevronLeft, faChevronRight, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type JSX, type MouseEvent, useEffect } from "react";
import { createPortal } from "react-dom";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { buildRawFileUrl, buildThumbnailUrl, resolvePreviewSource } from "#utils/preview.ts";

import styles from "./lightbox.module.css";
import { LightboxDetails } from "./lightbox-details.tsx";

export interface LightboxProps {
  entry: DirectoryEntry;
  relativePath: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDelete: (entry: DirectoryEntry) => void;
  availableTags: string[];
  onTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
}

const isTextInput = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && target.tagName === "INPUT";

export const Lightbox = ({
  entry,
  relativePath,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  onRename,
  onDelete,
  availableTags,
  onTagsChange,
}: LightboxProps): JSX.Element => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isTextInput(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && hasPrev) {
        onPrev();
      } else if (event.key === "ArrowRight" && hasNext) {
        onNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const previewSource = resolvePreviewSource(entry);

  const preview =
    previewSource.kind === "audio" ? (
      <audio controls preload="none" src={buildRawFileUrl(relativePath)} className={styles.audio} />
    ) : previewSource.kind === "image" ? (
      <img
        src={
          previewSource.useThumbnail
            ? buildThumbnailUrl(relativePath)
            : buildRawFileUrl(relativePath)
        }
        alt={entry.name}
        className={styles.image}
      />
    ) : null;

  return createPortal(
    <div className={styles.backdrop} data-testid="lightbox-backdrop" onClick={handleBackdropClick}>
      <div className={styles.content} role="dialog" aria-modal="true" aria-label={entry.name}>
        <button type="button" className={styles.closeButton} aria-label="Close" onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>
        <button
          type="button"
          className={styles.navButton}
          aria-label="Previous"
          disabled={!hasPrev}
          onClick={onPrev}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div className={styles.preview}>{preview}</div>
        <button
          type="button"
          className={styles.navButton}
          aria-label="Next"
          disabled={!hasNext}
          onClick={onNext}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
        <LightboxDetails
          entry={entry}
          onRename={onRename}
          onDelete={onDelete}
          availableTags={availableTags}
          onTagsChange={onTagsChange}
        />
      </div>
    </div>,
    document.body,
  );
};
