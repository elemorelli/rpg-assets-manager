import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import type { JSX, KeyboardEvent } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { buildRawFileUrl, buildThumbnailUrl, resolvePreviewSource } from "#utils/preview.ts";

import styles from "./asset-preview.module.css";

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

  if (entry.type === "directory") {
    return (
      <span
        data-size={size}
        aria-label="Folder"
        className={clsx(styles.folderIcon, isLarge && styles.folderIconLarge)}>
        <FontAwesomeIcon icon={faFolder} />
      </span>
    );
  }

  const previewSource = resolvePreviewSource(entry);

  if (previewSource.kind === "image") {
    const imageUrl = previewSource.useThumbnail
      ? buildThumbnailUrl(relativePath)
      : buildRawFileUrl(relativePath);
    const isOpenable = !isLarge && onOpen !== undefined;

    const handleOpenClick = (): void => {
      onOpen?.(entry);
    };

    const handleOpenKeyDown = (event: KeyboardEvent<HTMLImageElement>): void => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen?.(entry);
      }
    };

    const image = (
      <img
        src={imageUrl}
        alt={entry.name}
        loading="lazy"
        data-size={size}
        className={clsx(styles.image, isLarge && styles.imageLarge)}
        role={isOpenable ? "button" : undefined}
        tabIndex={isOpenable ? 0 : undefined}
        onClick={isOpenable ? handleOpenClick : undefined}
        onKeyDown={isOpenable ? handleOpenKeyDown : undefined}
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
    return (
      <audio controls preload="none" src={buildRawFileUrl(relativePath)} className={styles.audio} />
    );
  }

  return (
    <span
      data-size={size}
      className={clsx(styles.placeholder, isLarge && styles.placeholderLarge)}
      aria-label="No preview available"
    />
  );
};
