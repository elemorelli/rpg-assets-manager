const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
const PADDED_WIDTH = 2;

const pad = (value: number): string => String(value).padStart(PADDED_WIDTH, "0");

export const formatDuration = (totalSeconds: number): string => {
  const wholeSeconds = Math.floor(totalSeconds);
  const hours = Math.floor(wholeSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor((wholeSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = wholeSeconds % SECONDS_PER_MINUTE;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(seconds)}`;
};
