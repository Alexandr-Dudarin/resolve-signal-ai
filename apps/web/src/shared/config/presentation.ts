import type {
  FeedbackCategory,
  FeedbackSource,
  FeedbackStatus,
  ReplyStatus,
  Sentiment,
  Severity,
} from "@resolve-signal/contracts";

export const feedbackSourceLabels: Record<FeedbackSource, string> = {
  manual: "Вручную",
  web_form: "Веб-форма",
  support: "Поддержка",
  store_review: "Отзыв в магазине",
  api: "API",
};

export const feedbackStatusLabels: Record<FeedbackStatus, string> = {
  new: "Новый",
  triaged: "Обработан",
  in_progress: "В работе",
  resolved: "Решён",
  replied: "Ответ отправлен",
};

export const sentimentLabels: Record<Sentiment, string> = {
  positive: "Позитивная",
  neutral: "Нейтральная",
  negative: "Негативная",
  mixed: "Смешанная",
};

export const severityLabels: Record<Severity, string> = {
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
  critical: "Критическая",
};

export const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  product: "Продукт",
  service: "Сервис",
  delivery: "Доставка",
  payment: "Оплата",
  refund: "Возврат",
  support: "Поддержка",
  account: "Аккаунт",
  other: "Другое",
};

export const replyStatusLabels: Record<ReplyStatus, string> = {
  draft: "Черновик",
  approved: "Одобрен",
  rejected: "Отклонён",
};

export const replyToneLabels: Record<string, string> = {
  empathetic: "Эмпатичный",
  concise: "Краткий",
  warm: "Тёплый",
};

const enumLabels: Record<string, string> = {
  ...feedbackSourceLabels,
  ...feedbackStatusLabels,
  ...sentimentLabels,
  ...severityLabels,
  ...feedbackCategoryLabels,
  ...replyStatusLabels,
  pending: "Ожидает AI-анализа",
};

export function getPresentationLabel(value: string) {
  return enumLabels[value] ?? value;
}

export function getReplyToneLabel(value: string | null) {
  return value ? replyToneLabels[value] ?? "Предложенный" : "Предложенный";
}
