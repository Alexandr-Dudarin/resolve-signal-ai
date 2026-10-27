import { DemoRateLimitErrorSchema } from "@resolve-signal/contracts";
import { formatRetryAfterDuration } from "./retry-after";

export function demoLimitMessage(error: unknown): string | undefined {
  if (error && typeof error === "object" && "demoReadOnly" in error && error.demoReadOnly === true) {
    return "Это обращение доступно только для чтения. Создайте своё тестовое обращение, чтобы попробовать AI и редактирование.";
  }
  if (!error || typeof error !== "object" || !("demoLimit" in error)) return undefined;
  const result = DemoRateLimitErrorSchema.safeParse(error.demoLimit);
  if (!result.success) return undefined;
  const { scope, retryAfterSeconds } = result.data;
  if (scope === "guest_ai_record") return "Для этого обращения исчерпан лимит AI-операций. Можно создать новое тестовое обращение; общие AI-лимиты продолжают действовать.";
  const message = scope === "guest_owner_records" ? "Вы достигли лимита обращений в этом гостевом сеансе."
    : scope === "guest_records" ? "В демо временно нет места для новых обращений."
    : scope.startsWith("guest_session_") ? "Слишком много новых гостевых сеансов."
    : scope.startsWith("read_") ? "Слишком много запросов к демо."
    : scope.startsWith("login_") ? "Слишком много попыток входа."
    : scope === "sessions" ? "Демо сейчас занято."
      : scope === "create_global" ? "На сегодня исчерпан общий лимит новых обращений демо."
        : "Слишком много изменений за короткое время.";
  return `${message} Попробуйте через ${formatRetryAfterDuration(retryAfterSeconds)}.`;
}
