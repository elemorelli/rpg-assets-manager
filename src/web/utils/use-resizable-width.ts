import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { nextWidth } from "./resizable-width.ts";

export interface UseResizableWidthOptions {
  defaultWidth: number;
  min: number;
  max: number;
  storageKey: string;
}

export interface UseResizableWidthResult {
  width: number;
  startResizing: (event: ReactMouseEvent) => void;
}

interface DragState {
  startWidth: number;
  startClientX: number;
}

const readStoredWidth = (storageKey: string, fallback: number): number => {
  const stored = window.localStorage.getItem(storageKey);
  const parsed = stored ? Number(stored) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
};

export const useResizableWidth = ({
  defaultWidth,
  min,
  max,
  storageKey,
}: UseResizableWidthOptions): UseResizableWidthResult => {
  const [width, setWidth] = useState<number>(() => readStoredWidth(storageKey, defaultWidth));
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent): void => {
      const dragState = dragStateRef.current;

      if (!dragState) {
        return;
      }

      setWidth(nextWidth(dragState.startWidth, dragState.startClientX, event.clientX, min, max));
    };

    const handleMouseUp = (): void => {
      if (!dragStateRef.current) {
        return;
      }

      dragStateRef.current = null;
      setWidth((current) => {
        window.localStorage.setItem(storageKey, String(current));

        return current;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [min, max, storageKey]);

  const startResizing = useCallback(
    (event: ReactMouseEvent): void => {
      dragStateRef.current = { startWidth: width, startClientX: event.clientX };
    },
    [width],
  );

  return { width, startResizing };
};
