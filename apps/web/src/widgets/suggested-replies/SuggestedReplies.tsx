import type { SuggestedReply } from "@resolve-signal/contracts";
import { MessageSquareText } from "lucide-react";
import { GenerateRepliesButton } from "../../features/generate-reply/GenerateRepliesButton";
import { ReplyEditor } from "../../features/update-reply/ReplyEditor";
import styles from "./SuggestedReplies.module.css";

export function SuggestedReplies({ feedbackId, replies }: { feedbackId: string; replies: SuggestedReply[] }) {
  return (
    <section className={styles.section}>
      <header><div className={styles.title}><MessageSquareText aria-hidden="true" /><span><small>Работа с ответами</small><h2>Предложенные ответы</h2></span></div>{replies.length ? <div className={styles.headerAction}><GenerateRepliesButton feedbackId={feedbackId} /></div> : null}</header>
      {replies.length ? <div className={styles.grid}>{replies.map((reply) => <ReplyEditor key={reply.id} reply={reply} />)}</div> : <div className={styles.empty}><div><MessageSquareText aria-hidden="true" /></div><h3>Предложенных ответов пока нет</h3><p>Создайте проверенные черновики ответов на основе последнего AI-анализа.</p><GenerateRepliesButton feedbackId={feedbackId} /></div>}
    </section>
  );
}
