import { CircleUserRound } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useAiRuntimeStatus } from "../../shared/api/use-ai-runtime-status";
import { AppSidebar } from "../../widgets/app-sidebar/AppSidebar";
import { useDemoAccess } from "../../features/demo-access/DemoAccessGate";
import { Button } from "../../shared/ui/button";
import styles from "./RootLayout.module.css";

export function RootLayout() {
  const access = useDemoAccess();
  const runtimeStatus = useAiRuntimeStatus();
  const workspaceLabel =
    runtimeStatus.data?.mode === "live"
      ? "Демо · OpenAI"
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

            <CircleUserRound aria-hidden="true" />
            <span><strong>Гость</strong><small>{access.mode === "guest" ? "Без регистрации" : "Общее демо"}</small></span>
            {access.enabled && access.authenticated ? <Button variant="secondary" size="sm" disabled={access.busy} onClick={() => void access.logout()}>{access.busy ? "Выходим…" : access.mode === "guest" ? "Завершить сеанс" : "Выйти"}</Button> : null}
          </div>
        </header>
        <div className={styles.notice}>Общее демо: обращения и изменения видны всем участникам. Не вводите персональные или конфиденциальные данные.{access.mode === "guest" ? " Общие примеры доступны только для чтения. Создайте своё обращение, чтобы попробовать AI. Гостевые данные хранятся временно." : ""}</div>
        {access.error ? <p className={styles.notice} role="alert">{access.error}</p> : null}
        <main className={styles.main}><Outlet /></main>
      </div>
    </div>
  );
}
