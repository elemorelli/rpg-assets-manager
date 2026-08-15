import { type JSX, type ReactNode, useState } from "react";

import styles from "./panel-drawer.module.css";

export interface PanelDrawerProps {
  children: ReactNode;
}

const DRAWER_STATUS_LABEL = "Panels";

export const PanelDrawer = ({ children }: PanelDrawerProps): JSX.Element => {
  const [collapsed, setCollapsed] = useState<boolean>(true);

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
