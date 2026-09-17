import { AiUsageLimitErrorSchema, type AiUsageLimitError } from "@resolve-signal/contracts";

export function getAiUsageLimit(error: unknown): AiUsageLimitError | undefined {
  if (!error || typeof error !== "object" || !("aiUsageLimit" in error)) return undefined;
  const parsed = AiUsageLimitErrorSchema.safeParse(error.aiUsageLimit);
  return parsed.success ? parsed.data : undefined;
}

export function formatRetryAfterDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  if (safeSeconds < 60) return safeSeconds === 0 ? "несколько секунд" : `${safeSeconds} сек`;
  const minutes = Math.ceil(safeSeconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} ч${remainingMinutes ? ` ${remainingMinutes} мин` : ""}`;
}

export function formatAiUsageLimitMessage(limit: AiUsageLimitError): string {
  const retry = `Попробуйте через ${formatRetryAfterDuration(limit.retryAfterSeconds)}.`;
  switch (limit.scope) {
    case "ip_minute":
      return `Слишком много AI-запросов за короткое время. ${retry}`;
    case "ip_day":
      return `Вы исчерпали суточный лимит AI-запросов. ${retry}`;
    case "global_day":
      return `На сегодня исчерпан общий лимит AI-запросов демо. ${retry}`;
  }
}

export function aiUsageLimitMessage(error: unknown): string | undefined {
  const limit = getAiUsageLimit(error);
  return limit ? formatAiUsageLimitMessage(limit) : undefined;
}
