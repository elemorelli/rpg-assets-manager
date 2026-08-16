export interface Size {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export const clampMenuPosition = (
  requested: Position,
  menuSize: Size,
  viewportSize: Size,
): Position => {
  const overflowsRight = requested.x + menuSize.width > viewportSize.width;
  const overflowsBottom = requested.y + menuSize.height > viewportSize.height;

  const flippedX = overflowsRight ? requested.x - menuSize.width : requested.x;
  const flippedY = overflowsBottom ? requested.y - menuSize.height : requested.y;

  return {
    x: Math.max(0, flippedX),
    y: Math.max(0, flippedY),
  };
};
