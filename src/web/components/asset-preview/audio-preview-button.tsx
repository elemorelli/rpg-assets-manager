import { faPause, faPlay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type JSX, type MouseEvent, useRef, useState } from "react";

import { buildRawFileUrl } from "#utils/preview.ts";

import styles from "./asset-preview.module.css";

export interface AudioPreviewButtonProps {
  relativePath: string;
}

export const AudioPreviewButton = ({ relativePath }: AudioPreviewButtonProps): JSX.Element => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();

    const audioElement = audioRef.current;

    if (!audioElement) {
      return;
    }

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
  };

  return (
    <span className={styles.audio}>
      <audio
        ref={audioRef}
        preload="none"
        className={styles.audioElement}
        src={buildRawFileUrl(relativePath)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        className={styles.audioButton}
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={handleToggle}>
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} />
      </button>
    </span>
  );
};
