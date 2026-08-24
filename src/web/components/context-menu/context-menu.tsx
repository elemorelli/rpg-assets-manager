import { type JSX, type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Panel } from "#components/panel/panel.tsx";
import { clampMenuPosition } from "#web/utils/clamp-menu-position.ts";

import styles from "./context-menu.module.css";

export interface ContextMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  children: ReactNode;
}

export const ContextMenu = ({
  position,
  onClose,
  children,
}: ContextMenuProps): JSX.Element | null => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [displayPosition, setDisplayPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDisplayPosition(position);
  }, [position]);

  useEffect(() => {
    if (!position || !menuRef.current) {
      return;
    }

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportSize = { width: window.innerWidth, height: window.innerHeight };
    const clamped = clampMenuPosition(
      position,
      { width: menuRect.width, height: menuRect.height },
      viewportSize,
    );

    setDisplayPosition((current) =>
      current && current.x === clamped.x && current.y === clamped.y ? current : clamped,
    );
  });

  useEffect(() => {
    if (!position) {
      return;
    }

    const handleMouseDown = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [position, onClose]);

  if (!displayPosition) {
    return null;
  }

  return createPortal(
    <Panel
      ref={menuRef}
      role="menu"
      className={styles.menu}
      style={{ position: "fixed", left: displayPosition.x, top: displayPosition.y }}
      // A portal still bubbles React events up through the component tree it was
      // declared in, not the DOM tree it renders into. Without this, clicking a menu
      // item also bubbles into the underlying row's onClick and reselects that row.
      onClick={(event) => event.stopPropagation()}>
      {children}
    </Panel>,
    document.body,
  );
};
