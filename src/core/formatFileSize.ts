const UNITS = ["B", "KB", "MB", "GB"] as const;
const UNIT_STEP = 1024;
const ROUNDING_FACTOR = 10;

export const formatFileSize = (bytes: number): string => {
  if (bytes < UNIT_STEP) {
    return `${bytes} B`;
  }

  let value = bytes;
  let unitIndex = 0;

  while (value >= UNIT_STEP && unitIndex < UNITS.length - 1) {
    value /= UNIT_STEP;
    unitIndex += 1;
  }

  const rounded = Math.round(value * ROUNDING_FACTOR) / ROUNDING_FACTOR;

  return `${rounded} ${UNITS[unitIndex]}`;
};
