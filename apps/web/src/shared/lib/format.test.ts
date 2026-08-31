import { describe, expect, it } from "vitest";
import { capitalizeFirst, formatDate, formatRating } from "./format";

describe("Russian presentation formatting", () => {
  it("formats dates and ratings for the Russian locale", () => {
    expect(formatDate("2026-08-30T14:32:10.000Z")).toMatch(/30 авг\. 2026 г\./);
    expect(formatRating(5)).toBe("5,0");
  });

  it("capitalizes Cyrillic problem labels", () => {
    expect(capitalizeFirst("задержка доставки")).toBe("Задержка доставки");
  });
});
