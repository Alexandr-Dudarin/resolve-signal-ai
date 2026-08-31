import { AlertTriangle, Inbox, ScanText, ThumbsDown } from "lucide-react";
import type { DashboardSummary } from "@resolve-signal/contracts";
import styles from "./DashboardStats.module.css";

export function DashboardStats({ data }: { data: DashboardSummary }) {
  const cards = [
    { label: "Всего обращений", value: data.total, hint: "Все обращения клиентов", icon: Inbox, tone: "accent" },
    { label: "AI-анализ", value: data.analyzed, hint: `${data.total ? Math.round((data.analyzed / data.total) * 100) : 0}% обращений`, icon: ScanText, tone: "ai" },
    { label: "Негативные", value: data.negative, hint: "Требуют внимания", icon: ThumbsDown, tone: "warning" },
    { label: "Критические", value: data.critical, hint: "Нужна срочная проверка", icon: AlertTriangle, tone: "critical" },
    { label: "Ожидают действий", value: data.awaitingReview, hint: "Новые или первично обработанные", icon: Inbox, tone: "neutral" },
  ];
  return <section className={styles.grid} aria-label="Показатели обзора">{cards.map(({ label, value, hint, icon: Icon, tone }) => <article key={label} className={styles.card}><div className={`${styles.icon} ${styles[tone]}`}><Icon aria-hidden="true" /></div><span>{label}</span><strong>{value.toLocaleString("ru-RU")}</strong><small>{hint}</small><i className={`${styles.line} ${styles[tone]}`} /></article>)}</section>;
}
