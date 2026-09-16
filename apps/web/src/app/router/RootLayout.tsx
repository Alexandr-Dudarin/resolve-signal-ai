import { Bell, CircleUserRound } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useAiRuntimeStatus } from "../../shared/api/use-ai-runtime-status";
import { AppSidebar } from "../../widgets/app-sidebar/AppSidebar";
import styles from "./RootLayout.module.css";

export function RootLayout() {
  const runtimeStatus = useAiRuntimeStatus();
  const workspaceLabel =
    runtimeStatus.data?.mode === "live"
      ? "Live-пространство"
      : runtimeStatus.data?.mode === "demo"
        ? "Демо-пространство"
        : "Рабочее пространство";

  return (
    <div className={styles.shell}>
      <AppSidebar />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.demo}><span />{workspaceLabel}</div>
          <div className={styles.profile}>
            <button aria-label="Уведомления"><Bell /></button>
            <CircleUserRound aria-hidden="true" />
            <span><strong>Алексей Морозов</strong><small>Операции</small></span>
          </div>
        </header>
        <main className={styles.main}><Outlet /></main>
      </div>
    </div>
  );
}
