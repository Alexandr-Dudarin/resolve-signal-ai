import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../shared/api/api-client";
import { AppSidebar } from "./AppSidebar";

vi.mock("../../shared/api/api-client", () => ({
  api: {
    aiRuntimeStatus: vi.fn(),
  },
}));

function renderSidebar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppSidebar AI status", () => {
  beforeEach(() => {
    vi.mocked(api.aiRuntimeStatus).mockReset();
  });

  it("shows deterministic copy in mock mode", async () => {
    vi.mocked(api.aiRuntimeStatus).mockResolvedValue({
      provider: "mock",
      model: "resolve-mock-v1",
      mode: "demo",
    });

    renderSidebar();

    expect(await screen.findByText("AI-демо работает")).toBeInTheDocument();
    expect(screen.getByText("Детерминированный AI-анализ включён")).toBeInTheDocument();
    expect(screen.getByText("Внешняя AI-модель не требуется")).toBeInTheDocument();
  });

  it("shows the configured model in live mode without secret data", async () => {
    vi.mocked(api.aiRuntimeStatus).mockResolvedValue({
      provider: "openai",
      model: "gpt-5.6-luna",
      mode: "live",
    });

    const { container } = renderSidebar();

    expect(await screen.findByText("Live AI работает")).toBeInTheDocument();
    expect(screen.getByText("OpenAI подключён")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.6-luna")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("OPENAI_API_KEY");
  });
});
