import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FeedbackListItem } from "@resolve-signal/contracts";
import { api } from "../../shared/api/api-client";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../shared/api/api-client", () => ({
  api: {
    aiRuntimeStatus: vi.fn(),
    dashboard: vi.fn(),
  },
}));

const dashboard = {
  total: 3,
  negative: 1,
  critical: 1,
  awaitingReview: 1,
  analyzed: 3,
  sentiment: [
    { key: "positive" as const, count: 1 },
    { key: "neutral" as const, count: 0 },
    { key: "negative" as const, count: 1 },
    { key: "mixed" as const, count: 1 },
  ],
  severity: [
    { key: "low" as const, count: 1 },
    { key: "medium" as const, count: 1 },
    { key: "high" as const, count: 0 },
    { key: "critical" as const, count: 1 },
  ],
  recentFeedback: [],
};

describe("DashboardPage AI status", () => {
  beforeEach(() => {
    vi.mocked(api.dashboard).mockReset();
    vi.mocked(api.aiRuntimeStatus).mockReset();
    vi.mocked(api.dashboard).mockResolvedValue(dashboard);
  });

  it("uses provider-aware live copy and renders the backend model", async () => {
    vi.mocked(api.aiRuntimeStatus).mockResolvedValue({
      provider: "openai",
      model: "gpt-5.6-luna",
      mode: "live",
    });

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Live AI")).toBeInTheDocument();
    expect(screen.getByText("OpenAI подключён к рабочему циклу обработки обращений.")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.6-luna")).toBeInTheDocument();
    expect(screen.queryByText("AI-демо готово показать полный цикл обработки обращения.")).not.toBeInTheDocument();
  });
});


function recentExample(index: number): FeedbackListItem {
  const timestamp = "2026-10-27T12:00:00.000Z";

  return {
    id: `90000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    source: "manual",
    externalId: `FDB-EX-${String(index).padStart(3, "0")}`,
    rating: null,
    text: `Пример обращения ${index}`,
    authorName: `Клиент ${index}`,
    customerRef: null,
    status: index % 2 === 0 ? "replied" : "new",
    createdAt: timestamp,
    updatedAt: timestamp,
    latestAnalysis: null,
  };
}

describe("DashboardPage recent feedback navigation", () => {
  beforeEach(() => {
    vi.mocked(api.dashboard).mockReset();
    vi.mocked(api.aiRuntimeStatus).mockReset();
    vi.mocked(api.aiRuntimeStatus).mockResolvedValue({
      provider: "mock",
      model: "resolve-mock-v1",
      mode: "demo",
    });
  });

  function renderOverview() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    return client;
  }

  it("shows all eight recent items without a redundant Show all link", async () => {
    const items = Array.from({ length: 8 }, (_, index) => recentExample(index + 1));
    vi.mocked(api.dashboard).mockResolvedValue({ ...dashboard, total: 8, recentFeedback: items });

    const client = renderOverview();

    expect(await screen.findAllByText("FDB-EX-008")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(9); // Header and eight records.
    expect(screen.queryByRole("link", { name: /Показать все/i })).not.toBeInTheDocument();
    client.clear();
  });

  it("shows the Show all link when eleven records exist but only ten are recent", async () => {
    const items = Array.from({ length: 10 }, (_, index) => recentExample(index + 1));
    vi.mocked(api.dashboard).mockResolvedValue({ ...dashboard, total: 11, recentFeedback: items });

    const client = renderOverview();

    expect(await screen.findAllByText("FDB-EX-010")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(11); // Header and ten records.
    expect(screen.getByRole("link", { name: /Показать все/i })).toHaveAttribute("href", "/feedback");
    client.clear();
  });
});
