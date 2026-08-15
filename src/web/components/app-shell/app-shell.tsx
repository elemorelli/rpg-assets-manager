import type { CSSProperties, JSX, ReactNode } from "react";

import { useResizableWidth } from "#web/utils/use-resizable-width.ts";

import styles from "./app-shell.module.css";

export interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  drawer: ReactNode;
}

const DEFAULT_SIDEBAR_WIDTH_PX = 260;
const MIN_SIDEBAR_WIDTH_PX = 180;
const MAX_SIDEBAR_WIDTH_PX = 480;
const SIDEBAR_WIDTH_STORAGE_KEY = "sidebarWidth";

export const AppShell = ({ sidebar, main, drawer }: AppShellProps): JSX.Element => {
  const { width, startResizing } = useResizableWidth({
    defaultWidth: DEFAULT_SIDEBAR_WIDTH_PX,
    min: MIN_SIDEBAR_WIDTH_PX,
    max: MAX_SIDEBAR_WIDTH_PX,
    storageKey: SIDEBAR_WIDTH_STORAGE_KEY,
  });

  const shellStyle = { "--sidebar-width": `${width}px` } as CSSProperties;

  return (
    <div className={styles.shell} style={shellStyle} data-testid="app-shell">
      <div className={styles.sidebar}>
        {sidebar}
        <button
          type="button"
          className={styles.resizeHandle}
          aria-label="Resize sidebar"
          onMouseDown={startResizing}
        />
      </div>
      <div className={styles.main}>{main}</div>
      <div className={styles.drawerRegion}>{drawer}</div>
    </div>
  );
};
