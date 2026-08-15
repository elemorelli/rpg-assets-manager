export const nextWidth = (
  startWidth: number,
  startClientX: number,
  currentClientX: number,
  min: number,
  max: number,
): number => {
  const draggedDelta = currentClientX - startClientX;
  const rawWidth = startWidth + draggedDelta;

  return Math.min(max, Math.max(min, rawWidth));
};
