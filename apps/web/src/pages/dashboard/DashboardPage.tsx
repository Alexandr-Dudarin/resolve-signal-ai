import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/api-client";
import { sentimentLabels } from "../../shared/config/presentation";
import { FeedbackState } from "../../shared/ui/feedback-state";
import { PageHeader } from "../../shared/ui/page-header";
import { DashboardStats } from "../../widgets/dashboard-stats/DashboardStats";
import { FeedbackTable } from "../../widgets/feedback-table/FeedbackTable";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  return (
    <>
      <PageHeader title="Обзор" description="Следите за обращениями клиентов, находите проблемные случаи и проверяйте результаты AI-анализа в одном рабочем пространстве." actions={<Link className={styles.primaryAction} to="/feedback/new"><Plus />Добавить обращение</Link>} />
      {query.isPending ? <section className={styles.panel}><FeedbackState kind="loading" /></section> : query.isError ? <section className={styles.panel}><FeedbackState kind="error" message="Не удалось загрузить данные обзора." onRetry={() => void query.refetch()} /></section> : (
        <>
          <DashboardStats data={query.data} />
          <div className={styles.insightGrid}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}><div><span>Тональность обращений</span><h2>Распределение по тональности</h2></div><Link to="/feedback">К обращениям <ArrowRight /></Link></div>
              <div className={styles.bars}>{query.data.sentiment.map((item) => { const percent = query.data.analyzed ? Math.round((item.count / query.data.analyzed) * 100) : 0; return <div key={item.key} className={styles.barRow}><div><span>{sentimentLabels[item.key]}</span><strong>{item.count} <small>{percent}%</small></strong></div><div className={styles.track}><i className={styles[item.key]} style={{ width: `${percent}%` }} /></div></div>; })}</div>
            </section>
            <section className={styles.aiPanel}>
              <div className={styles.aiMark}><Sparkles aria-hidden="true" /></div><span>Гибридный интеллект</span><h2>AI-демо готово показать полный цикл обработки обращения.</h2><p>AI-анализ и варианты ответов формируются по детерминированным правилам, проверяются контрактами и сохраняются в PostgreSQL — без ключа внешней модели.</p><div className={styles.aiMeta}><div><strong>{query.data.analyzed}</strong><span>Проанализировано</span></div><div><strong>{query.data.critical}</strong><span>Критические</span></div><div><strong>v1</strong><span>AI-демо</span></div></div>
            </section>
          </div>
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>Последние обращения</span><h2>Недавние обращения</h2></div><Link to="/feedback">Показать все <ArrowRight /></Link></div>
            {query.data.recentFeedback.length ? <FeedbackTable items={query.data.recentFeedback} /> : <FeedbackState kind="empty" message="Добавьте первое обращение, чтобы наполнить обзор данными." />}
          </section>
        </>
      )}
    </>
  );
}
