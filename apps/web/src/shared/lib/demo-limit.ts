import { DemoRateLimitErrorSchema } from "@resolve-signal/contracts";
import { formatRetryAfterDuration } from "./retry-after";

export function demoLimitMessage(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("demoLimit" in error)) return undefined;
  const result = DemoRateLimitErrorSchema.safeParse(error.demoLimit);
  if (!result.success) return undefined;
  const { scope, retryAfterSeconds } = result.data;
  const message = scope.startsWith("login_") ? "Слишком много попыток входа."
    : scope === "sessions" ? "Демо сейчас занято."
      : scope === "create_global" ? "На сегодня исчерпан общий лимит новых обращений демо."
        : "Слишком много изменений за короткое время.";
  return `${message} Попробуйте через ${formatRetryAfterDuration(retryAfterSeconds)}.`;
}
