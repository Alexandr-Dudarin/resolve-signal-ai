import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { api } from "../../shared/api/api-client";
import { Button } from "../../shared/ui/button";
import styles from "./GenerateRepliesButton.module.css";

export function GenerateRepliesButton({ feedbackId }: { feedbackId: string }) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.generateReplies(feedbackId, { tones: ["empathetic", "concise"] }),
    onSuccess: async () => client.invalidateQueries({ queryKey: ["feedback", feedbackId] }),
  });
  return <div className={styles.action}><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><MessageSquareText size={16} />{mutation.isPending ? "Генерируем…" : mutation.isError ? "Повторить генерацию" : "Создать ответы"}</Button>{mutation.isError ? <p role="alert">Не удалось создать ответы. Существующий AI-анализ и черновики сохранены.</p> : null}</div>;
}
