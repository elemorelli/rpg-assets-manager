import type { JSX } from "react";
import type { DirectoryEntry } from "../../../utils/directoryListing.ts";
import {
  buildRawFileUrl,
  buildThumbnailUrl,
  resolvePreviewSource,
} from "../../../utils/preview.ts";
import styles from "./AssetPreview.module.css";

export interface AssetPreviewProps {
  entry: DirectoryEntry;
  relativePath: string;
}

export const AssetPreview = ({ entry, relativePath }: AssetPreviewProps): JSX.Element => {
  const previewSource = resolvePreviewSource(entry);

  if (previewSource.kind === "image") {
    const imageUrl = previewSource.useThumbnail
      ? buildThumbnailUrl(relativePath)
      : buildRawFileUrl(relativePath);

    return <img src={imageUrl} alt={entry.name} loading="lazy" className={styles.image} />;
  }

  if (previewSource.kind === "audio") {
    return (
      <audio controls preload="none" src={buildRawFileUrl(relativePath)} className={styles.audio} />
    );
  }

  return <span className={styles.placeholder} aria-label="No preview available" />;
};
