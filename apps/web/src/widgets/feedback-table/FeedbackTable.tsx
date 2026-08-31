import type { FeedbackListItem } from "@resolve-signal/contracts";
import { ArrowUpRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../shared/ui/badge";
import { feedbackSourceLabels } from "../../shared/config/presentation";
import { formatDate, formatRating, shortId } from "../../shared/lib/format";
import styles from "./FeedbackTable.module.css";

export function FeedbackTable({ items }: { items: FeedbackListItem[] }) {
  return (
    <div className={`${styles.wrap} rs-scrollbar`}>
      <table className={styles.table}>
        <thead><tr><th>Обращение</th><th>Клиент</th><th>Оценка</th><th>Категория</th><th>Критичность</th><th>Статус</th><th>Источник</th><th>Получено</th><th><span className={styles.srOnly}>Открыть</span></th></tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><Link className={styles.id} to={`/feedback/${item.id}`}>{shortId(item.id, item.externalId)}</Link></td>
              <td><strong>{item.authorName ?? "Анонимный клиент"}</strong><small>{item.text}</small></td>
              <td>{item.rating ? <span className={styles.rating}><Star aria-hidden="true" />{formatRating(item.rating)}</span> : <span className={styles.muted}>—</span>}</td>
              <td>{item.latestAnalysis ? <Badge value={item.latestAnalysis.category} /> : <span className={styles.muted}>Ожидает AI-анализа</span>}</td>
              <td>{item.latestAnalysis ? <Badge value={item.latestAnalysis.severity} /> : <span className={styles.muted}>—</span>}</td>
              <td><Badge value={item.status} /></td>
              <td>{feedbackSourceLabels[item.source]}</td>
              <td>{formatDate(item.createdAt)}</td>
              <td><Link className={styles.open} aria-label={`Открыть ${shortId(item.id, item.externalId)}`} to={`/feedback/${item.id}`}><ArrowUpRight /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.cards}>
        {items.map((item) => (
          <Link to={`/feedback/${item.id}`} key={item.id} className={styles.card}>
            <div><span className={styles.id}>{shortId(item.id, item.externalId)}</span><Badge value={item.latestAnalysis?.severity ?? "pending"} /></div>
            <strong>{item.authorName ?? "Анонимный клиент"}</strong>
            <p>{item.text}</p>
            <footer><span>{feedbackSourceLabels[item.source]}</span><Badge value={item.status} /><ArrowUpRight /></footer>
          </Link>
        ))}
      </div>
    </div>
  );
}
