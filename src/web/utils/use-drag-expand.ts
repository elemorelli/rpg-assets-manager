import { type DragEvent, useEffect, useRef, useState } from "react";

export interface UseDragExpandParams<ElementType extends HTMLElement> {
  isDropTarget: boolean;
  isExpanded: boolean;
  delayMs: number;
  onExpand: () => void;
  onDrop: (event: DragEvent<ElementType>) => void;
}

export interface UseDragExpandResult<ElementType extends HTMLElement> {
  dragOver: boolean;
  handleDragOver: (event: DragEvent<ElementType>) => void;
  handleDragLeave: () => void;
  handleDrop: (event: DragEvent<ElementType>) => void;
}

export const useDragExpand = <ElementType extends HTMLElement>({
  isDropTarget,
  isExpanded,
  delayMs,
  onExpand,
  onDrop,
}: UseDragExpandParams<ElementType>): UseDragExpandResult<ElementType> => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const expandTimerRef = useRef<number | null>(null);

  const clearExpandTimer = (): void => {
    if (expandTimerRef.current !== null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearExpandTimer();
    };
  }, []);

  const handleDragOver = (event: DragEvent<ElementType>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();

    if (!dragOver) {
      setDragOver(true);

      if (!isExpanded && expandTimerRef.current === null) {
        expandTimerRef.current = window.setTimeout(() => {
          expandTimerRef.current = null;
          onExpand();
        }, delayMs);
      }
    }
  };

  const handleDragLeave = (): void => {
    setDragOver(false);
    clearExpandTimer();
  };

  const handleDrop = (event: DragEvent<ElementType>): void => {
    if (!isDropTarget) {
      return;
    }

    event.preventDefault();
    setDragOver(false);
    clearExpandTimer();
    onDrop(event);
  };

  return { dragOver, handleDragOver, handleDragLeave, handleDrop };
};
