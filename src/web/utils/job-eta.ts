const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export const computeEtaSeconds = (
  done: number,
  total: number,
  startedAt: number,
  now: number,
): number | null => {
  if (done <= 0 || total <= 0 || done >= total) {
    return null;
  }

  const elapsedMs = now - startedAt;

  if (elapsedMs <= 0) {
    return null;
  }

  const remainingUnits = total - done;
  const msPerUnit = elapsedMs / done;

  return Math.round((remainingUnits * msPerUnit) / MS_PER_SECOND);
};

export const formatEta = (seconds: number): string => {
  if (seconds < SECONDS_PER_MINUTE) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const remainingSeconds = seconds % SECONDS_PER_MINUTE;

  return `${minutes}m ${remainingSeconds}s`;
};
