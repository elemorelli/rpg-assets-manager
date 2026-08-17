import clsx from "clsx";
import { type JSX, useState } from "react";

import { ReconciliationPanel } from "#components/reconciliation-panel/reconciliation-panel.tsx";
import { SyncHistoryPanel } from "#components/sync-history-panel/sync-history-panel.tsx";
import { SyncPanel } from "#components/sync-panel/sync-panel.tsx";

import styles from "./sync-section.module.css";

export interface SyncSectionProps {
  onApplied: () => void;
}

type TabKey = "sync" | "history" | "reconcile";

interface TabDefinition {
  key: TabKey;
  label: string;
}

const TABS: TabDefinition[] = [
  { key: "sync", label: "Sync" },
  { key: "history", label: "History" },
  { key: "reconcile", label: "Reconcile" },
];

const tabPanelStyle = (isActive: boolean): { display?: "none" } =>
  isActive ? {} : { display: "none" };

export const SyncSection = ({ onApplied }: SyncSectionProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>("sync");
  const [syncHistoryRefreshToken, setSyncHistoryRefreshToken] = useState<number>(0);

  const handleApplied = (): void => {
    onApplied();
    setSyncHistoryRefreshToken((token) => token + 1);
  };

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
      <div style={tabPanelStyle(activeTab === "sync")}>
        <SyncPanel onApplied={handleApplied} />
      </div>
      <div style={tabPanelStyle(activeTab === "history")}>
        <SyncHistoryPanel refreshToken={syncHistoryRefreshToken} />
      </div>
      <div style={tabPanelStyle(activeTab === "reconcile")}>
        <ReconciliationPanel />
      </div>
    </div>
  );
};
