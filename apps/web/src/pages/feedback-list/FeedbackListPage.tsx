import { useQuery } from "@tanstack/react-query";
import { FilterX, Plus, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import {
  feedbackCategories,
  feedbackSources,
  feedbackStatuses,
  severities,
  type FeedbackCategory,
  type FeedbackSource,
  type FeedbackStatus,
  type Severity,
} from "@resolve-signal/contracts";
import { api } from "../../shared/api/api-client";
import { feedbackCategoryLabels, feedbackSourceLabels, feedbackStatusLabels, severityLabels } from "../../shared/config/presentation";
import { Checkbox } from "../../shared/ui/checkbox";
import { FeedbackState } from "../../shared/ui/feedback-state";
import { PageHeader } from "../../shared/ui/page-header";
import { Select, type SelectOption } from "../../shared/ui/select";
import { FeedbackTable } from "../../widgets/feedback-table/FeedbackTable";
import styles from "./FeedbackListPage.module.css";

const option = (value: string, label: string): SelectOption => ({ value, label });
const statusOptions = [option("", "Все статусы"), ...feedbackStatuses.map((value) => option(value, feedbackStatusLabels[value]))];
const severityOptions = [option("", "Любая критичность"), ...severities.map((value) => option(value, severityLabels[value]))];
const categoryOptions = [option("", "Все категории"), ...feedbackCategories.map((value) => option(value, feedbackCategoryLabels[value]))];
const sourceOptions = [option("", "Все источники"), ...feedbackSources.map((value) => option(value, feedbackSourceLabels[value]))];

export function FeedbackListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("");
  const [hideCompleted, setHideCompleted] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const filters = { search: deferredSearch || undefined, status: status as FeedbackStatus || undefined, severity: severity as Severity || undefined, category: category as FeedbackCategory || undefined, source: source as FeedbackSource || undefined, page: 1, pageSize: 50 };
  const query = useQuery({ queryKey: ["feedback", filters], queryFn: () => api.listFeedback(filters) });
  const visibleItems = query.data?.items.filter((item) => !hideCompleted || !["resolved", "replied"].includes(item.status)) ?? [];
  const hasFilters = Boolean(search || status || severity || category || source || hideCompleted);
  const clear = () => { setSearch(""); setStatus(""); setSeverity(""); setCategory(""); setSource(""); setHideCompleted(false); };

  return (
    <>
      <PageHeader eyebrow="Входящие обращения" title="Обращения" description="Ищите, обрабатывайте и открывайте обращения клиентов в одном списке." actions={<Link className={styles.primaryAction} to="/feedback/new"><Plus />Добавить обращение</Link>} />
      <section className={styles.panel}>
        <div className={styles.filters}>
          <label className={styles.search}><Search aria-hidden="true" /><span className={styles.srOnly}>Поиск обращений</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Обращение, клиент или ID" /></label>
          <Select value={status} onChange={setStatus} ariaLabel="Фильтр по статусу" options={statusOptions} />
          <Select value={severity} onChange={setSeverity} ariaLabel="Фильтр по критичности" options={severityOptions} />
          <Select value={category} onChange={setCategory} ariaLabel="Фильтр по категории" options={categoryOptions} />
          <Select value={source} onChange={setSource} ariaLabel="Фильтр по источнику" options={sourceOptions} />
        </div>
        <div className={styles.filterFooter}>
          <Checkbox checked={hideCompleted} onChange={setHideCompleted} size="sm">Скрыть завершённые на этой странице</Checkbox>
          <div><span>{query.data ? `${visibleItems.length} из ${query.data.total} обращений` : "Загрузка обращений"}</span>{hasFilters ? <button onClick={clear}><FilterX />Сбросить фильтры</button> : null}</div>
        </div>
      </section>
      <section className={styles.tablePanel}>
        {query.isPending ? <FeedbackState kind="loading" /> : query.isError ? <FeedbackState kind="error" message="Не удалось загрузить обращения. Проверьте, что API запущен." onRetry={() => void query.refetch()} /> : visibleItems.length ? <FeedbackTable items={visibleItems} /> : <FeedbackState kind="empty" title={hasFilters ? "Подходящих обращений нет" : "Обращений пока нет"} message={hasFilters ? "Попробуйте сбросить один или несколько фильтров." : "Добавьте первое обращение, чтобы запустить AI-анализ."} />}
      </section>
    </>
  );
}
