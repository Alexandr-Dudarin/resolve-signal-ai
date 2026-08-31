import { describe, expect, it } from "vitest";
import {
  feedbackCategoryLabels,
  feedbackSourceLabels,
  feedbackStatusLabels,
  getPresentationLabel,
  getReplyToneLabel,
  sentimentLabels,
  severityLabels,
} from "./presentation";

describe("presentation labels", () => {
  it("maps internal enum values to Russian UI labels", () => {
    expect(feedbackStatusLabels.in_progress).toBe("В работе");
    expect(feedbackStatusLabels.triaged).toBe("Обработан");
    expect(feedbackCategoryLabels.payment).toBe("Оплата");
    expect(feedbackSourceLabels.store_review).toBe("Отзыв в магазине");
    expect(sentimentLabels.negative).toBe("Негативная");
    expect(severityLabels.critical).toBe("Критическая");
    expect(getPresentationLabel("approved")).toBe("Одобрен");
  });

  it("keeps unknown technical values stable and uses a safe tone fallback", () => {
    expect(getPresentationLabel("future_value")).toBe("future_value");
    expect(getReplyToneLabel("future_tone")).toBe("Предложенный");
  });
});
