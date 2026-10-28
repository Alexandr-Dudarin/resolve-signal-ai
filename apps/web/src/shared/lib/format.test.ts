import { describe, expect, it } from "vitest";
import { capitalizeFirst, formatDate, formatRating, shortId } from "./format";

describe("Russian presentation formatting", () => {
  it("formats dates and ratings for the Russian locale", () => {
    expect(formatDate("2026-08-30T14:32:10.000Z")).toMatch(/30 авг\. 2026 г\./);
    expect(formatRating(5)).toBe("5,0");
  });

  it("shows unique public-demo IDs without changing stored UUIDs", () => {
    expect(shortId("90000000-0000-4000-8000-000000000001")).toBe("FDB-DEMO-001");
    expect(shortId("90000000-0000-4000-8000-000000000005")).toBe("FDB-DEMO-005");
    expect(shortId("90000000-0000-4000-8000-000000000001", "FDB-CUSTOM-1")).toBe("FDB-CUSTOM-1");
    expect(shortId("11111111-1111-4111-8111-111111111111")).toBe("FDB-111111");
  });

  it("capitalizes Cyrillic problem labels", () => {
    expect(capitalizeFirst("задержка доставки")).toBe("Задержка доставки");
  });
});
