import {
  faFile,
  faFileCircleExclamation,
  faFolder,
  faMusic,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import { type JSX, type KeyboardEvent, useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { buildRawFileUrl, buildThumbnailUrl, resolvePreviewSource } from "#utils/preview.ts";

import styles from "./asset-preview.module.css";
import { AudioPreviewButton } from "./audio-preview-button.tsx";

export interface AssetPreviewProps {
  entry: DirectoryEntry;
  relativePath: string;
  size?: "small" | "large";
  onOpen?: (entry: DirectoryEntry) => void;
}

export const AssetPreview = ({
  entry,
  relativePath,
  size = "small",
  onOpen,
}: AssetPreviewProps): JSX.Element => {
  const isLarge = size === "large";
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  if (entry.type === "directory") {
    return (
      <span
        data-size={size}
        aria-label="Directory"
        className={clsx(styles.directoryIcon, isLarge && styles.directoryIconLarge)}>
        <FontAwesomeIcon icon={faFolder} />
      </span>
    );
  }

  if (entry.syncStatus === "deleted") {
    return (
      <span
        data-size={size}
        className={clsx(styles.placeholder, isLarge && styles.placeholderLarge)}
        aria-label="Deleted file, no preview available"
      />
    );
  }

  const previewSource = resolvePreviewSource(entry);

  if (previewSource.kind === "image") {
    if (imageLoadFailed) {
      return (
        <span
          data-size={size}
          aria-label="Image failed to load"
          className={clsx(styles.errorIcon, isLarge && styles.errorIconLarge)}>
          <FontAwesomeIcon icon={faFileCircleExclamation} />
        </span>
      );
    }

    const imageUrl = previewSource.useThumbnail
      ? buildThumbnailUrl(relativePath)
      : buildRawFileUrl(relativePath);
    const isOpenable = onOpen !== undefined;

    const handleOpenClick = (): void => {
      onOpen?.(entry);
    };

    const handleOpenKeyDown = (event: KeyboardEvent<HTMLImageElement>): void => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen?.(entry);
      }
    };

    const handleImageError = (): void => {
      setImageLoadFailed(true);
    };

    const image = (
      <img
        src={imageUrl}
        alt={entry.name}
        loading="lazy"
        data-size={size}
        className={clsx(
          styles.image,
          isLarge && styles.imageLarge,
          isOpenable && styles.imageOpenable,
        )}
        role={isOpenable ? "button" : undefined}
        tabIndex={isOpenable ? 0 : undefined}
        onClick={isOpenable ? handleOpenClick : undefined}
        onKeyDown={isOpenable ? handleOpenKeyDown : undefined}
        onError={handleImageError}
      />
    );

    if (isLarge) {
      return image;
    }

    return (
      <span className={styles.previewWrapper}>
        {image}
        <img src={imageUrl} alt="" aria-hidden="true" className={styles.imageZoom} />
      </span>
    );
  }

  if (previewSource.kind === "audio") {
    if (!isLarge) {
      return <AudioPreviewButton relativePath={relativePath} />;
    }

    const isOpenable = onOpen !== undefined;

    const handleOpenClick = (): void => {
      onOpen?.(entry);
    };

    const handleOpenKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen?.(entry);
      }
    };

    return (
      <span data-size={size} className={styles.audioPreviewArea}>
        <span
          aria-label={entry.name}
          role={isOpenable ? "button" : undefined}
          tabIndex={isOpenable ? 0 : undefined}
          className={clsx(styles.audioIconLarge, isOpenable && styles.audioIconOpenable)}
          onClick={isOpenable ? handleOpenClick : undefined}
          onKeyDown={isOpenable ? handleOpenKeyDown : undefined}>
          <FontAwesomeIcon icon={faMusic} />
        </span>
        <span className={styles.audioButtonOverlay}>
          <AudioPreviewButton relativePath={relativePath} />
        </span>
      </span>
    );
  }

  return (
    <span
      data-size={size}
      aria-label="No preview available"
      className={clsx(styles.fileIcon, isLarge && styles.fileIconLarge)}>
      <FontAwesomeIcon icon={faFile} />
    </span>
  );
};
