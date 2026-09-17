import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CircleUserRound, Globe2, Sparkles, Star } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import type { FeedbackStatus } from "@resolve-signal/contracts";
import { AnalyzeFeedbackButton } from "../../features/analyze-feedback/AnalyzeFeedbackButton";
import { api } from "../../shared/api/api-client";
import { feedbackSourceLabels, feedbackStatusLabels } from "../../shared/config/presentation";
import { formatDate, formatRating, shortId } from "../../shared/lib/format";
import { Badge } from "../../shared/ui/badge";
import { FeedbackState } from "../../shared/ui/feedback-state";
import { PageHeader } from "../../shared/ui/page-header";
import { Select } from "../../shared/ui/select";
import { FeedbackAnalysisPanel } from "../../widgets/feedback-analysis/FeedbackAnalysisPanel";
import { SuggestedReplies } from "../../widgets/suggested-replies/SuggestedReplies";
import styles from "./FeedbackDetailsPage.module.css";

const statusOptions = [
  { value: "new", label: feedbackStatusLabels.new },
  { value: "triaged", label: feedbackStatusLabels.triaged },
  { value: "in_progress", label: feedbackStatusLabels.in_progress },
  { value: "resolved", label: feedbackStatusLabels.resolved },
  { value: "replied", label: feedbackStatusLabels.replied },
];

export function FeedbackDetailsPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const routeState = location.state as { analysisFailed?: boolean } | null;
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["feedback", id], queryFn: () => api.feedback(id), enabled: Boolean(id) });
  const statusMutation = useMutation({
    mutationFn: (status: FeedbackStatus) => api.updateStatus(id, status),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["feedback"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (query.isPending) return <section className={styles.statePanel}><FeedbackState kind="loading" /></section>;
  if (query.isError) return <section className={styles.statePanel}><FeedbackState kind="error" title="Обращение недоступно" message="Возможно, обращения не существует или API недоступен." onRetry={() => void query.refetch()} /></section>;
  const feedback = query.data;

  return (
    <>
      <Link to="/feedback" className={styles.back}><ArrowLeft />К списку обращений</Link>
      <PageHeader eyebrow="Детали обращения" title={shortId(feedback.id, feedback.externalId)} description="Исходный текст клиента, структурированный AI-анализ и подготовка ответа." actions={<div className={styles.statusControl}><span>Статус</span><Select value={feedback.status} onChange={(value) => statusMutation.mutate(value as FeedbackStatus)} disabled={statusMutation.isPending} ariaLabel="Статус обращения" layout="full" dropdownAlign="end" options={statusOptions} /></div>} />
      {routeState?.analysisFailed && !feedback.latestAnalysis ? <p className={styles.actionError} role="alert">Обращение сохранено, но автоматический AI-анализ не завершился. Повторите запуск в блоке AI-анализа.</p> : null}
      {statusMutation.isError ? <p className={styles.actionError} role="alert">Не удалось обновить статус. Предыдущее значение сохранено.</p> : null}
      <div className={styles.heroGrid}>
        <section className={styles.original}>
          <header><div><span>01</span><h2>Исходное обращение</h2></div><Badge value={feedback.status} /></header>
          <div className={styles.originalBody}>
            <div className={styles.rating}>{feedback.rating ? Array.from({ length: 5 }, (_, index) => <Star key={index} className={index < feedback.rating! ? styles.filled : ""} aria-hidden="true" />) : <span>Оценка не указана</span>}{feedback.rating ? <strong>{formatRating(feedback.rating)}</strong> : null}</div>
            <dl><div><dt><CircleUserRound />Клиент</dt><dd>{feedback.authorName ?? "Анонимный клиент"}</dd></div><div><dt><CalendarDays />Получено</dt><dd>{formatDate(feedback.createdAt)}</dd></div><div><dt><Globe2 />Источник</dt><dd>{feedbackSourceLabels[feedback.source]}</dd></div><div><dt>Идентификатор</dt><dd>{feedback.customerRef ?? "—"}</dd></div></dl>
            <blockquote>“{feedback.text}”</blockquote>
          </div>
        </section>
        {feedback.latestAnalysis ? <FeedbackAnalysisPanel analysis={feedback.latestAnalysis} /> : <section className={styles.analysisEmpty}><div><Sparkles aria-hidden="true" /></div><span>AI-анализ</span><h2>Получите структурированный разбор обращения.</h2><p>AI-демо определит тональность, критичность, категорию, краткое содержание и основные проблемы.</p><AnalyzeFeedbackButton feedbackId={feedback.id} /></section>}
      </div>
      <SuggestedReplies
        feedbackId={feedback.id}
        currentGeneration={feedback.currentReplyGeneration}
        replies={feedback.suggestedReplies}
      />
    </>
  );
}
