import clsx from "clsx";
import { type JSX, useState } from "react";

import { ReconciliationPanel } from "#components/reconciliation-panel/reconciliation-panel.tsx";
import { SyncHistoryPanel } from "#components/sync-history-panel/sync-history-panel.tsx";

import styles from "./sync-section.module.css";

export interface SyncSectionProps {
  historyRefreshTrigger?: number;
}

type TabKey = "history" | "reconcile";

interface TabDefinition {
  key: TabKey;
  label: string;
}

const TABS: TabDefinition[] = [
  { key: "history", label: "History" },
  { key: "reconcile", label: "Reconcile" },
];

const tabPanelStyle = (isActive: boolean): { display?: "none" } =>
  isActive ? {} : { display: "none" };

export const SyncSection = ({ historyRefreshTrigger }: SyncSectionProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>("history");

  return (
    <div className={styles.section}>
      <div className={styles.tabList} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={clsx(styles.tab, activeTab === tab.key && styles.tabActive)}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={tabPanelStyle(activeTab === "history")}>
        <SyncHistoryPanel refreshToken={historyRefreshTrigger ?? 0} />
      </div>
      <div style={tabPanelStyle(activeTab === "reconcile")}>
        <ReconciliationPanel />
      </div>
    </div>
  );
};
