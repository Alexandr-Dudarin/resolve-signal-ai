import { describe, expect, it } from "vitest";
import { formatAiUsageLimitMessage, formatRetryAfterDuration, getAiUsageLimit } from "./ai-usage-limit";

describe("AI quota presentation", () => {
  it.each([
    [0, "несколько секунд"], [42, "42 сек"], [60, "1 мин"],
    [61, "2 мин"], [3600, "1 ч"], [14820, "4 ч 7 мин"], [86400, "24 ч"],
  ])("humanizes %s seconds", (seconds, expected) => {
    expect(formatRetryAfterDuration(seconds)).toBe(expected);
  });

  it.each([
    ["ip_minute", "Слишком много AI-запросов за короткое время."],
    ["ip_day", "Вы исчерпали суточный лимит AI-запросов."],
    ["global_day", "На сегодня исчерпан общий лимит AI-запросов демо."],
  ] as const)("explains %s without parsing server messages", (scope, expected) => {
    expect(formatAiUsageLimitMessage({ code: "AI_USAGE_LIMIT_EXCEEDED", scope, retryAfterSeconds: 14820 }))
      .toBe(`${expected} Попробуйте через 4 ч 7 мин.`);
  });

  it("rejects invalid structured quota details", () => {
    expect(getAiUsageLimit({ aiUsageLimit: { scope: "ip_day", retryAfterSeconds: -1 } })).toBeUndefined();
    expect(getAiUsageLimit(new Error("AI_USAGE_LIMIT_EXCEEDED ip_day"))).toBeUndefined();
  });
});
