import type {
  ReplyGeneration,
  SuggestedReply,
} from "@resolve-signal/contracts";
import {
  ChevronDown,
  Clock3,
  Coins,
  Cpu,
  MessageSquareText,
} from "lucide-react";

import { GenerateRepliesButton } from "../../features/generate-reply/GenerateRepliesButton";
import { ReplyEditor } from "../../features/update-reply/ReplyEditor";
import {
  getAiProviderLabel,
  getReplyToneLabel,
} from "../../shared/config/presentation";
import { formatDate } from "../../shared/lib/format";
import { Badge } from "../../shared/ui/badge";

import styles from "./SuggestedReplies.module.css";

type SuggestedRepliesProps = {
  feedbackId: string;
  currentGeneration: ReplyGeneration | null;
  replies: SuggestedReply[];
};

function formatTokenCount(value: number | null) {
  return value === null ? "—" : value.toLocaleString("ru-RU");
}

export function SuggestedReplies({
  feedbackId,
  currentGeneration,
  replies,
}: SuggestedRepliesProps) {
  const currentReplies = currentGeneration
    ? replies.filter(
        (reply) => reply.generationId === currentGeneration.id,
      )
    : replies;

  const historicalDecisions = currentGeneration
    ? replies.filter(
        (reply) =>
          reply.generationId !== currentGeneration.id &&
          (reply.status === "approved" ||
            reply.status === "rejected"),
      )
    : [];

  const showHeaderAction =
    currentGeneration !== null || currentReplies.length > 0;

  return (
    <div className={styles.wrapper}>
      <section className={styles.section}>
        <header>
          <div className={styles.title}>
            <MessageSquareText aria-hidden="true" />
            <span>
              <small>Работа с ответами</small>
              <h2>Текущие предложения</h2>
            </span>
          </div>

          {showHeaderAction ? (
            <div className={styles.headerAction}>
              <GenerateRepliesButton
                feedbackId={feedbackId}
                hasCurrentGeneration={currentGeneration !== null}
              />
            </div>
          ) : null}
        </header>

        {currentGeneration ? (
          <div
            className={styles.generationMeta}
            aria-label="Параметры текущей генерации"
          >
            <span><Cpu aria-hidden="true" />{currentGeneration.model}</span>
            <span>{getAiProviderLabel(currentGeneration.provider)}</span>
            <span>
              <Coins aria-hidden="true" />
              {formatTokenCount(currentGeneration.inputTokens)} вход / {formatTokenCount(currentGeneration.outputTokens)} выход
            </span>
            <span><Clock3 aria-hidden="true" />{formatDate(currentGeneration.createdAt)}</span>
          </div>
        ) : null}

        {currentReplies.length ? (
          <div className={styles.grid}>
            {currentReplies.map((reply) => (
              <ReplyEditor key={reply.id} reply={reply} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <div><MessageSquareText aria-hidden="true" /></div>
            <h3>Предложенных ответов пока нет</h3>
            <p>Создайте проверенные черновики ответов на основе последнего AI-анализа.</p>
            {!showHeaderAction ? (
              <GenerateRepliesButton
                feedbackId={feedbackId}
                hasCurrentGeneration={false}
              />
            ) : null}
          </div>
        )}
      </section>

      {historicalDecisions.length ? (
        <section className={styles.historySection}>
          <details>
            <summary>
              <span>
                <small>Сохранённые решения</small>
                <strong>История решений</strong>
              </span>
              <span className={styles.historyCount}>
                {historicalDecisions.length}
              </span>
              <ChevronDown aria-hidden="true" />
            </summary>

            <div className={styles.historyList}>
              {historicalDecisions.map((reply) => (
                <article className={styles.historyReply} key={reply.id}>
                  <header>
                    <div>
                      <span>{getReplyToneLabel(reply.tone)} вариант</span>
                      <Badge value={reply.status} />
                    </div>
                    <small>
                      {reply.generationId === null
                        ? "Ранее сохранённый ответ"
                        : reply.editedAt
                          ? `Изменён ${formatDate(reply.editedAt)}`
                          : formatDate(reply.createdAt)}
                    </small>
                  </header>
                  <p>{reply.text}</p>
                </article>
              ))}
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}
