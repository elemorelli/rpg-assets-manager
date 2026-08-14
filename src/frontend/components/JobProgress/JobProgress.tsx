import { type JSX, useEffect, useState } from "react";
import { type CurrentJob, parseJobEvent } from "#utils/job.ts";
import styles from "./JobProgress.module.css";

export const JobProgress = (): JSX.Element | null => {
  const [job, setJob] = useState<CurrentJob>(null);

  useEffect(() => {
    const source = new EventSource("/api/jobs/stream");

    source.onmessage = (event) => {
      setJob(parseJobEvent(event.data));
    };

    return () => {
      source.close();
    };
  }, []);

  if (!job) {
    return null;
  }

  if (job.error) {
    return <p className={styles.error}>{`${job.type} failed: ${job.error}`}</p>;
  }

  return (
    <div className={styles.progress}>
      <span>{`${job.type}: ${job.stage}`}</span>
      <progress value={job.done} max={job.total} />
      <span>{`${job.done} / ${job.total}`}</span>
    </div>
  );
};
