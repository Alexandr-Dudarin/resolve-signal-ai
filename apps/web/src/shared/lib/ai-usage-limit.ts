import { formatRetryAfterDuration } from "./retry-after";
export { formatRetryAfterDuration } from "./retry-after";
import { demoLimitMessage } from "./demo-limit";
import { AiUsageLimitErrorSchema, type AiUsageLimitError } from "@resolve-signal/contracts";

export function getAiUsageLimit(error: unknown): AiUsageLimitError | undefined {
  if (!error || typeof error !== "object" || !("aiUsageLimit" in error)) return undefined;
  const parsed = AiUsageLimitErrorSchema.safeParse(error.aiUsageLimit);
  return parsed.success ? parsed.data : undefined;
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
  return limit ? formatAiUsageLimitMessage(limit) : demoLimitMessage(error);
}
