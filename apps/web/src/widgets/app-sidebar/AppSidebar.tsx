import { Activity, Bot, Braces, Inbox, LayoutDashboard, Menu, Plus, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAiRuntimeStatus } from "../../shared/api/use-ai-runtime-status";
import styles from "./AppSidebar.module.css";

const mainNav = [
  { to: "/", label: "Обзор", icon: LayoutDashboard, end: true },
  { to: "/feedback", label: "Обращения", icon: Inbox },
  { to: "/feedback/new", label: "Добавить обращение", icon: Plus },
];

const plannedNav = [
  { label: "Кейсы", icon: Activity, phase: "Этап 2" },
  { label: "Активность агента", icon: Bot, phase: "Этап 2" },
  { label: "API-интеграции", icon: Braces, phase: "Этап 3" },
];

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const runtimeStatus = useAiRuntimeStatus();
  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const aiStatusCopy = runtimeStatus.isPending
    ? {
        title: "Проверяем AI-режим…",
        description: "Получаем статус подключения",
        detail: "Безопасная конфигурация",
      }
    : runtimeStatus.isError
      ? {
          title: "AI-статус недоступен",
          description: "Проверьте соединение с API",
          detail: "Режим не определён",
        }
      : runtimeStatus.data.mode === "live"
        ? {
            title: "Live AI работает",
            description: "OpenAI подключён",
            detail: runtimeStatus.data.model,
          }
        : {
            title: "AI-демо работает",
            description: "Детерминированный AI-анализ включён",
            detail: "Внешняя AI-модель не требуется",
          };

  return (
    <>
      <button ref={triggerRef} className={styles.mobileTrigger} aria-label="Открыть навигацию" aria-expanded={open} onClick={() => setOpen(true)}>
        <Menu aria-hidden="true" />
      </button>
      {open ? <button className={styles.backdrop} aria-label="Закрыть навигацию" onClick={close} /> : null}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`} aria-label="Основная навигация">
        <div className={styles.brandRow}>
          <NavLink to="/" className={styles.brand} onClick={close}>
            <span className={styles.logo}><Sparkles aria-hidden="true" /></span>
            <span><strong>ResolveSignal <em>AI</em></strong><small>Гибридный интеллект</small></span>
          </NavLink>
          <button ref={closeRef} className={styles.closeButton} aria-label="Закрыть навигацию" onClick={close}><X /></button>
        </div>
        <nav className={styles.nav}>
          <span className={styles.navLabel}>Рабочая область</span>
          {mainNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ""}`}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </NavLink>
          ))}
          <span className={styles.navLabel}>Следующие возможности</span>
          {plannedNav.map(({ label, icon: Icon, phase }) => (
            <div key={label} className={`${styles.navItem} ${styles.planned}`} aria-disabled="true">
              <Icon aria-hidden="true" /><span>{label}</span><small>{phase}</small>
            </div>
          ))}
        </nav>
        <div className={styles.aiStatus}>
          <div><span className={`${styles.pulse} ${runtimeStatus.isError ? styles.pulseError : runtimeStatus.isPending ? styles.pulsePending : ""}`} /><strong>{aiStatusCopy.title}</strong></div>
          <p>{aiStatusCopy.description}</p>
          <small>{aiStatusCopy.detail}</small>
        </div>
      </aside>
    </>
  );
}
