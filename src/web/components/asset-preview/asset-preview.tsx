import clsx from "clsx";
import type { JSX } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { buildRawFileUrl, buildThumbnailUrl, resolvePreviewSource } from "#utils/preview.ts";

import styles from "./asset-preview.module.css";

export interface AssetPreviewProps {
  entry: DirectoryEntry;
  relativePath: string;
  size?: "small" | "large";
}

export const AssetPreview = ({
  entry,
  relativePath,
  size = "small",
}: AssetPreviewProps): JSX.Element => {
  const previewSource = resolvePreviewSource(entry);
  const isLarge = size === "large";

  if (previewSource.kind === "image") {
    const imageUrl = previewSource.useThumbnail
      ? buildThumbnailUrl(relativePath)
      : buildRawFileUrl(relativePath);

    return (
      <img
        src={imageUrl}
        alt={entry.name}
        loading="lazy"
        data-size={size}
        className={clsx(styles.image, isLarge && styles.imageLarge)}
      />
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
