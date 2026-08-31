import { Bell, CircleUserRound } from "lucide-react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "../../widgets/app-sidebar/AppSidebar";
import styles from "./RootLayout.module.css";

export function RootLayout() {
  return (
    <div className={styles.shell}>
      <AppSidebar />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.demo}><span />Демо-пространство</div>
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
