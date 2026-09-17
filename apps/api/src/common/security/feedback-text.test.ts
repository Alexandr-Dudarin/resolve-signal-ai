import { describe, expect, it } from "vitest";
import { normalizeCreateFeedbackInput, normalizeFeedbackText } from "./feedback-text.js";

describe("plain-text feedback normalization", () => {
  it("keeps visible text, removes markup and discards script/style contents", () => {
    expect(normalizeFeedbackText('<b>Товар хороший</b><img src=x onerror=alert(1)><script>alert(1)</script><style>body{display:none}</style>'))
      .toBe("Товар хороший");
  });

  it("normalizes line endings and removes controls while preserving line breaks and tabs", () => {
    expect(normalizeFeedbackText("  Первая\u0000\u0001 строка\r\nВторая\rТретья\u007f\u0085\tстрока  "))
      .toBe("Первая строка\nВторая\nТретья\tстрока");
  });

  it("preserves plain punctuation, entities, URLs and block boundaries", () => {
    expect(normalizeFeedbackText('<p>Цена: 2 &lt; 3 &amp; 5 &gt; 4</p><p>https://example.com/image.png<br>Спасибо</p>'))
      .toBe("Цена: 2 < 3 & 5 > 4\nhttps://example.com/image.png\nСпасибо");
  });

  it("removes entity-encoded control characters too", () => {
    expect(normalizeFeedbackText("До&#1;ставка\r\nопоздала")).toBe("Доставка\nопоздала");
  });

  it("leaves invalid input types for schema validation", () => {
    expect(normalizeCreateFeedbackInput(null)).toBeNull();
    expect(normalizeCreateFeedbackInput({ text: 123 })).toEqual({ text: 123 });
    expect(normalizeCreateFeedbackInput({ text: "<b>Привет</b>", rating: 4 }))
      .toEqual({ text: "Привет", rating: 4 });
  });
});
