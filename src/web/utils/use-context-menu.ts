import { useState } from "react";

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuTriggerEvent {
  clientX: number;
  clientY: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface UseContextMenuResult {
  position: ContextMenuPosition | null;
  open: (event: ContextMenuTriggerEvent) => void;
  close: () => void;
}

export const useContextMenu = (): UseContextMenuResult => {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);

  const open = (event: ContextMenuTriggerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    setPosition({ x: event.clientX, y: event.clientY });
  };

  const close = (): void => {
    setPosition(null);
  };

  return { position, open, close };
};
