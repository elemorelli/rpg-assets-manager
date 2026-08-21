import { faDownload, faMusic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { JSX } from "react";

import { IconButton } from "#components/icon-button/icon-button.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import * as api from "#web/requests/index.ts";
import { useFetchOnMount } from "#web/utils/use-fetch-on-mount.ts";

import styles from "./foundry-playlist-list.module.css";

const SINGLE_TRACK_COUNT = 1;

const formatTrackCount = (count: number): string =>
  count === SINGLE_TRACK_COUNT ? "1 track" : `${count} tracks`;

export const FoundryPlaylistList = (): JSX.Element => {
  const { data: tags, message } = useFetchOnMount(() => api.fetchFoundryPlaylistTags(), []);

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>
        <FontAwesomeIcon className={styles.headingIcon} icon={faMusic} aria-hidden="true" />
        Playlists
      </h3>
      {message && <MessageBanner message={message} />}
      {!tags && !message && <p>Checking audio tags...</p>}
      {tags && tags.length === 0 && <p>No audio assets tagged yet.</p>}
      {tags && tags.length > 0 && (
        <ul className={styles.tagList}>
          {tags.map((tag) => (
            <li key={tag.tag} className={styles.tag}>
              <span className={styles.tagName}>{tag.tag}</span>
              <span className={styles.trackCount}>{formatTrackCount(tag.count)}</span>
              <IconButton
                icon={faDownload}
                label="Download"
                href={api.buildFoundryPlaylistExportUrl(tag.tag)}
                download
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
