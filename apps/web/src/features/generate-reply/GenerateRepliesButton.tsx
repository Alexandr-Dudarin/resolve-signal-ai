import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { api } from "../../shared/api/api-client";
import { Button } from "../../shared/ui/button";
import { aiUsageLimitMessage } from "../../shared/lib/ai-usage-limit";
import styles from "./GenerateRepliesButton.module.css";

export function GenerateRepliesButton({
  feedbackId,
  hasCurrentGeneration,
}: {
  feedbackId: string;
  hasCurrentGeneration: boolean;
}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.generateReplies(feedbackId, { tones: ["empathetic", "concise"] }),
    retry: false,
    onSuccess: async () => client.invalidateQueries({ queryKey: ["feedback", feedbackId] }),
  });
  const idleLabel = hasCurrentGeneration
    ? "Сгенерировать новые варианты"
    : "Создать ответы";

  return <div className={styles.action}><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><MessageSquareText size={16} />{mutation.isPending ? "Генерируем…" : mutation.isError ? "Повторить генерацию" : idleLabel}</Button>{mutation.isError ? <p role="alert">{aiUsageLimitMessage(mutation.error) ?? "Не удалось создать ответы."} Существующий AI-анализ и черновики сохранены.</p> : null}</div>;
}
