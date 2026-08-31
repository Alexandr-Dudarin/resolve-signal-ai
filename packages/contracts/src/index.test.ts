import { describe, expect, it } from "vitest";

import { CreateFeedbackSchema, EntityIdSchema, FeedbackAnalysisSchema } from "./index.js";

describe("shared contracts", () => {
  it("normalizes a valid feedback payload", () => {
    expect(
      CreateFeedbackSchema.parse({
        text: "  Delivery arrived late.  ",
        rating: 3,
        authorName: "   ",
        customerRef: "",
      }),
    ).toEqual({ text: "Delivery arrived late.", rating: 3, source: "manual" });
  });

  it("rejects invalid structured analysis", () => {
    expect(() =>
      FeedbackAnalysisSchema.parse({
        sentiment: "angry",
        severity: "critical",
        category: "payment",
        summary: "Invalid sentiment",
        problems: [],
      }),
    ).toThrow();
  });

  it("rejects malformed entity identifiers before they reach persistence", () => {
    expect(() => EntityIdSchema.parse("not-a-uuid")).toThrow();
  });
});
