import { getPresentationLabel } from "../../config/presentation";
import styles from "./Badge.module.css";

export function Badge({ value }: { value: string }) {
  const tone = ["critical", "high", "negative", "rejected"].includes(value)
    ? "critical"
    : ["medium", "mixed", "triaged", "in_progress"].includes(value)
      ? "warning"
      : ["positive", "low", "resolved", "replied", "approved"].includes(value)
        ? "positive"
        : ["payment", "new"].includes(value)
          ? "accent"
          : "neutral";
  return <span className={`${styles.badge} ${styles[tone]}`}>{getPresentationLabel(value)}</span>;
}
