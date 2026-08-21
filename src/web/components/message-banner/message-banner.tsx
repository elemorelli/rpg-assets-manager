import { type JSX, useMemo } from "react";

import { ScrollList, type ScrollListRow } from "#components/scroll-list/scroll-list.tsx";
import type { Message } from "#web/utils/message.ts";

import styles from "./message-banner.module.css";

export interface MessageBannerProps {
  message: Message;
}

const buildDetailRows = (details: string[]): ScrollListRow[] =>
  details.map((detail) => ({ key: detail, label: detail }));

export const MessageBanner = ({ message }: MessageBannerProps): JSX.Element => {
  const detailRows = useMemo(
    () => (message.details ? buildDetailRows(message.details) : null),
    [message.details],
  );

  return (
    <div className={styles.banner}>
      <p className={styles[message.severity]}>{message.summary}</p>
      {detailRows && (
        <div className={styles.details}>
          <ScrollList rows={detailRows} />
        </div>
      )}
    </div>
  );
};
