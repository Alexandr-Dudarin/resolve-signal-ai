import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "../button";
import styles from "./FeedbackState.module.css";

type FeedbackStateProps = {
  kind: "loading" | "empty" | "error";
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function FeedbackState({ kind, title, message, onRetry }: FeedbackStateProps) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "error" ? AlertCircle : Inbox;
  const fallbackTitle = kind === "loading" ? "Загрузка обращений…" : kind === "error" ? "Что-то пошло не так" : "Обращения не найдены";
  return (
    <div className={styles.state} role={kind === "error" ? "alert" : "status"}>
      <Icon className={kind === "loading" ? styles.spin : ""} aria-hidden="true" />
      <div>
        <strong>{title ?? fallbackTitle}</strong>
        {message ? <p>{message}</p> : null}
      </div>
      {onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>Повторить</Button> : null}
    </div>
  );
}
