import type { PersistedFeedbackAnalysis } from "@resolve-signal/contracts";
import { AlertTriangle, BrainCircuit, Layers3, MessageCircleWarning, Sparkles } from "lucide-react";
import { capitalizeFirst } from "../../shared/lib/format";
import { Badge } from "../../shared/ui/badge";
import styles from "./FeedbackAnalysisPanel.module.css";

export function FeedbackAnalysisPanel({ analysis }: { analysis: PersistedFeedbackAnalysis }) {
  const metrics = [
    { label: "Тональность", value: analysis.sentiment, icon: MessageCircleWarning },
    { label: "Критичность", value: analysis.severity, icon: AlertTriangle },
    { label: "Категория", value: analysis.category, icon: Layers3 },
  ];
  return (
    <section className={styles.panel}>
      <header><div className={styles.aiIcon}><BrainCircuit aria-hidden="true" /></div><div><span>AI-анализ</span><h2>Структурированный анализ обращения</h2></div><div className={styles.model}><Sparkles />{analysis.model}</div></header>
      <div className={styles.body}>
        <div className={styles.metrics}>{metrics.map(({ label, value, icon: Icon }) => <div key={label}><Icon aria-hidden="true" /><span>{label}</span><Badge value={value} /></div>)}</div>
        <div className={styles.summary}><span>Краткое содержание</span><p>{analysis.summary}</p></div>
        <div className={styles.problems}><span>Выявленные проблемы</span>{analysis.problems.length ? <ul>{analysis.problems.map((problem) => <li key={problem}>{capitalizeFirst(problem)}</li>)}</ul> : <p>Проблемы в обращении не обнаружены.</p>}</div>
        <footer><span>Провайдер: <strong>{analysis.provider === "mock" ? "AI-демо" : analysis.provider}</strong></span><span>Сценарий: <strong>{analysis.promptVersion}</strong></span><span>Использование: <strong>{analysis.inputTokens ?? "—"} вход / {analysis.outputTokens ?? "—"} выход</strong></span></footer>
      </div>
    </section>
  );
}
