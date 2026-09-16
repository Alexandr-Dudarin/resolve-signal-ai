import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
