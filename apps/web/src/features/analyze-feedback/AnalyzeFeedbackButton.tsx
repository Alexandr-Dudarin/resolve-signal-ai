import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { api } from "../../shared/api/api-client";
import { Button } from "../../shared/ui/button";
import styles from "./AnalyzeFeedbackButton.module.css";

export function AnalyzeFeedbackButton({ feedbackId }: { feedbackId: string }) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.analyze(feedbackId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["feedback", feedbackId] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
  return <div className={styles.action}><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><Sparkles size={16} />{mutation.isPending ? "Анализируем…" : mutation.isError ? "Повторить AI-анализ" : "Запустить AI-анализ"}</Button>{mutation.isError ? <p role="alert">Не удалось выполнить AI-анализ. Результат не был сохранён.</p> : null}</div>;
}
