import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import type { SuggestedReply } from "@resolve-signal/contracts";
import { api } from "../../shared/api/api-client";
import { getReplyToneLabel } from "../../shared/config/presentation";
import { Badge } from "../../shared/ui/badge";
import { Button } from "../../shared/ui/button";
import styles from "./ReplyEditor.module.css";

export function ReplyEditor({ reply }: { reply: SuggestedReply }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply.text);
  const mutation = useMutation({
    mutationFn: (input: { text?: string; status?: "draft" | "approved" | "rejected" }) => api.updateReply(reply.id, input),
    onSuccess: async () => {
      setEditing(false);
      await client.invalidateQueries({ queryKey: ["feedback", reply.feedbackId] });
    },
  });
  return (
    <article className={styles.reply}>
      <header><div><span>{getReplyToneLabel(reply.tone)} вариант</span><Badge value={reply.status} /></div><div><Button size="sm" variant="ghost" onClick={() => setEditing((value) => !value)}><Pencil />{editing ? "Отменить" : "Изменить"}</Button><Button size="sm" variant="danger" disabled={mutation.isPending} onClick={() => mutation.mutate({ status: "rejected" })}><X />Отклонить</Button><Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ status: "approved" })}><Check />Одобрить</Button></div></header>
      {editing ? <div className={styles.editor}><textarea value={text} onChange={(event) => setText(event.target.value)} rows={9} aria-label="Редактировать предложенный ответ" /><Button size="sm" onClick={() => mutation.mutate({ text })} disabled={mutation.isPending || !text.trim()}>Сохранить ответ</Button></div> : <p>{reply.text}</p>}
      {mutation.isError ? <small className={styles.error} role="alert">Не удалось обновить ответ. Попробуйте ещё раз.</small> : null}
    </article>
  );
}
