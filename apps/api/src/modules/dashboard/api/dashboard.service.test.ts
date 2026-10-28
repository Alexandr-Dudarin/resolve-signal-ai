import { describe, expect, it, vi } from "vitest";
import type { FeedbackListItem } from "@resolve-signal/contracts";
import type { FeedbackRepository } from "../../feedback/domain/feedback.repository.js";
import { DashboardService } from "./dashboard.service.js";

function example(index: number): FeedbackListItem {
  const timestamp = "2026-10-27T12:00:00.000Z";

  return {
    id: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    source: "manual",
    externalId: `FDB-EX-${String(index).padStart(3, "0")}`,
    rating: null,
    text: `Тестовое обращение ${index}`,
    authorName: `Клиент ${index}`,
    customerRef: null,
    status: index % 2 === 0 ? "replied" : "new",
    createdAt: timestamp,
    updatedAt: timestamp,
    latestAnalysis: null,
  };
}

async function summaryWith(count: number) {
  // allForDashboard returns feedback sorted newest first, as the Prisma repository does.
  const items = Array.from({ length: count }, (_, index) => example(index + 1));
  const repository = {
    allForDashboard: vi.fn().mockResolvedValue({
      items,
      total: items.length,
      page: 1,
      pageSize: Math.max(1, items.length),
    }),
  } as unknown as FeedbackRepository;

  return new DashboardService(repository).summary();
}

describe("DashboardService recent feedback", () => {
  it("includes all eight examples, including completed feedback", async () => {
    const summary = await summaryWith(8);

    expect(summary.total).toBe(8);
    expect(summary.recentFeedback).toHaveLength(8);
    expect(summary.recentFeedback.some((item) => item.status === "replied")).toBe(true);
  });

  it("limits eleven entries to the ten most recent without changing total", async () => {
    const summary = await summaryWith(11);

    expect(summary.total).toBe(11);
    expect(summary.recentFeedback).toHaveLength(10);
    expect(summary.recentFeedback.map((item) => item.externalId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `FDB-EX-${String(index + 1).padStart(3, "0")}`),
    );
  });

  it("pins the three named processed showcases after seven newest records", async () => {
    const ids = [
      "33333333-3333-4333-8333-333333333333",
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ];
    const ordinary = Array.from({ length: 25 }, (_, index) => example(index + 1));
    const fixtures = ids.map((id, index) => ({
      ...example(index + 51),
      id,
      externalId: `FDB-SHOW-${index + 1}`,
    }));
    const items = [...ordinary, ...fixtures];
    const repository = {
      allForDashboard: vi.fn().mockResolvedValue({
        items, total: items.length, page: 1, pageSize: items.length,
      }),
    } as unknown as FeedbackRepository;

    const summary = await new DashboardService(repository).summary();
    expect(summary.total).toBe(28);
    expect(summary.recentFeedback).toHaveLength(10);
    expect(summary.recentFeedback.slice(0, 7).map((item) => item.id)).toEqual(
      ordinary.slice(0, 7).map((item) => item.id),
    );
    expect(summary.recentFeedback.slice(7).map((item) => item.id)).toEqual(ids);
    expect(new Set(summary.recentFeedback.map((item) => item.id)).size).toBe(10);
  });

  it("does not duplicate a pinned item when it is among the newest records", async () => {
    const pinned = { ...example(50), id: "11111111-1111-4111-8111-111111111111" };
    const ordinary = Array.from({ length: 12 }, (_, index) => example(index + 1));
    const items = [pinned, ...ordinary];
    const repository = {
      allForDashboard: vi.fn().mockResolvedValue({
        items, total: items.length, page: 1, pageSize: items.length,
      }),
    } as unknown as FeedbackRepository;

    const summary = await new DashboardService(repository).summary();
    expect(summary.recentFeedback).toHaveLength(10);
    expect(summary.recentFeedback.slice(0, 9).map((item) => item.id)).toEqual(
      ordinary.slice(0, 9).map((item) => item.id),
    );
    expect(summary.recentFeedback[9]?.id).toBe(pinned.id);
  });

  it("fills unused pinned slots with recent records if a showcase is missing", async () => {
    const summary = await summaryWith(11);
    expect(summary.recentFeedback).toHaveLength(10);
    expect(summary.recentFeedback.map((item) => item.externalId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `FDB-EX-${String(index + 1).padStart(3, "0")}`),
    );
  });

  it("handles an empty dashboard", async () => {
    const summary = await summaryWith(0);

    expect(summary.total).toBe(0);
    expect(summary.recentFeedback).toEqual([]);
  });
});
