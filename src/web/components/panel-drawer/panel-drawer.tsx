import { type JSX, type ReactNode, useEffect, useRef, useState } from "react";

import styles from "./panel-drawer.module.css";

export interface PanelDrawerProps {
  children: ReactNode;
  expandTrigger?: number;
}

const DRAWER_STATUS_LABEL = "Panels";

export const PanelDrawer = ({ children, expandTrigger }: PanelDrawerProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;

      return;
    }

    if (expandTrigger !== undefined) {
      setCollapsed(false);
    }
  }, [expandTrigger]);

  return (
    <div className={styles.drawer}>
      <div className={styles.header}>
        <span>{DRAWER_STATUS_LABEL}</span>
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((current) => !current)}>
          {collapsed ? "Show panels" : "Hide panels"}
        </button>
      </div>
      {!collapsed && <div className={styles.body}>{children}</div>}
    </div>
  );
};
