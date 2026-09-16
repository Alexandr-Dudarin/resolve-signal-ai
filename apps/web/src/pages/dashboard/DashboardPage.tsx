import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/api-client";
import { useAiRuntimeStatus } from "../../shared/api/use-ai-runtime-status";
import { sentimentLabels } from "../../shared/config/presentation";
import { FeedbackState } from "../../shared/ui/feedback-state";
import { PageHeader } from "../../shared/ui/page-header";
import { DashboardStats } from "../../widgets/dashboard-stats/DashboardStats";
import { FeedbackTable } from "../../widgets/feedback-table/FeedbackTable";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const runtimeStatus = useAiRuntimeStatus();
  const aiCopy = runtimeStatus.isPending
    ? {
        label: "AI-режим",
        title: "Проверяем активную AI-конфигурацию.",
        description: "Получаем безопасный статус провайдера и модели.",
        model: "—",
      }
    : runtimeStatus.isError
      ? {
          label: "AI-режим",
          title: "Статус AI временно недоступен.",
          description: "Данные обзора доступны, но конфигурацию AI сейчас подтвердить не удалось.",
          model: "—",
        }
      : runtimeStatus.data.mode === "live"
        ? {
            label: "Live AI",
            title: "OpenAI подключён к рабочему циклу обработки обращений.",
            description: "AI-анализ и варианты ответов выполняются действующей моделью, проверяются контрактами и сохраняются в PostgreSQL.",
            model: runtimeStatus.data.model,
          }
        : {
            label: "Гибридный интеллект",
            title: "AI-демо готово показать полный цикл обработки обращения.",
            description: "AI-анализ и варианты ответов формируются по детерминированным правилам, проверяются контрактами и сохраняются в PostgreSQL — без ключа внешней модели.",
            model: runtimeStatus.data.model,
          };

  return (
    <>
      <PageHeader title="Обзор" description="Следите за обращениями клиентов, находите проблемные случаи и проверяйте результаты AI-анализа в одном рабочем пространстве." actions={<Link className={styles.primaryAction} to="/feedback/new"><Plus />Добавить обращение</Link>} />
      {dashboardQuery.isPending ? <section className={styles.panel}><FeedbackState kind="loading" /></section> : dashboardQuery.isError ? <section className={styles.panel}><FeedbackState kind="error" message="Не удалось загрузить данные обзора." onRetry={() => void dashboardQuery.refetch()} /></section> : (
        <>
          <DashboardStats data={dashboardQuery.data} />
          <div className={styles.insightGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><span>Тональность обращений</span><h2>Распределение по тональности</h2></div><Link to="/feedback">К обращениям <ArrowRight /></Link></div>
              <div className={styles.bars}>{dashboardQuery.data.sentiment.map((item) => { const percent = dashboardQuery.data.analyzed ? Math.round((item.count / dashboardQuery.data.analyzed) * 100) : 0; return <div key={item.key} className={styles.barRow}><div><span>{sentimentLabels[item.key]}</span><strong>{item.count} <small>{percent}%</small></strong></div><div className={styles.track}><i className={styles[item.key]} style={{ width: `${percent}%` }} /></div></div>; })}</div>
            </section>
            <section className={styles.aiPanel}>
              <div className={styles.aiMark}><Sparkles aria-hidden="true" /></div><span>{aiCopy.label}</span><h2>{aiCopy.title}</h2><p>{aiCopy.description}</p><div className={styles.aiMeta}><div><strong>{dashboardQuery.data.analyzed}</strong><span>Проанализировано</span></div><div><strong>{dashboardQuery.data.critical}</strong><span>Критические</span></div><div><strong>{aiCopy.model}</strong><span>Модель</span></div></div>
            </section>
          </div>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Последние обращения</span><h2>Недавние обращения</h2></div><Link to="/feedback">Показать все <ArrowRight /></Link></div>
            {dashboardQuery.data.recentFeedback.length ? <FeedbackTable items={dashboardQuery.data.recentFeedback} /> : <FeedbackState kind="empty" message="Добавьте первое обращение, чтобы наполнить обзор данными." />}
          </section>
        </>
      )}
    </>
  );
}
