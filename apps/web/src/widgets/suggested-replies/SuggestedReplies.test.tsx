import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  ReplyGeneration,
  SuggestedReply,
} from "@resolve-signal/contracts";
import { describe, expect, it, vi } from "vitest";

import { SuggestedReplies } from "./SuggestedReplies";

vi.mock("../../shared/api/api-client", () => ({
  api: {
    generateReplies: vi.fn(),
    updateReply: vi.fn(),
  },
}));

const feedbackId = "11111111-1111-4111-8111-111111111111";
const analysisId = "22222222-2222-4222-8222-222222222222";
const currentGenerationId = "33333333-3333-4333-8333-333333333333";
const oldGenerationId = "44444444-4444-4444-8444-444444444444";
const timestamp = "2026-09-16T12:00:00.000Z";

const currentGeneration: ReplyGeneration = {
  id: currentGenerationId,
  feedbackId,
  analysisId,
  provider: "openai",
  model: "gpt-5.6-luna",
  promptVersion: "openai-replies-v1",
  inputTokens: 268,
  outputTokens: 168,
  supersededAt: null,
  createdAt: timestamp,
};

function reply(
  id: string,
  text: string,
  status: SuggestedReply["status"],
  generationId: string | null,
): SuggestedReply {
  return {
    id,
    feedbackId,
    analysisId,
    generationId,
    tone: "empathetic",
    originalText: generationId ? text : null,
    text,
    status,
    editedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function renderReplies(
  current: ReplyGeneration | null,
  replies: SuggestedReply[],
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <SuggestedReplies
        feedbackId={feedbackId}
        currentGeneration={current}
        replies={replies}
      />
    </QueryClientProvider>,
  );
}

describe("SuggestedReplies", () => {
  it("uses legacy replies as current suggestions before the first generation", () => {
    renderReplies(null, [
      reply(
        "55555555-5555-4555-8555-555555555555",
        "Старый черновик остаётся доступным.",
        "draft",
        null,
      ),
    ]);

    expect(screen.getByText("Текущие предложения")).toBeInTheDocument();
    expect(screen.getByText("Старый черновик остаётся доступным.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Создать ответы" })).toBeInTheDocument();
    expect(screen.queryByText("История решений")).not.toBeInTheDocument();
  });

  it("separates current replies from collapsible historical decisions", async () => {
    const user = userEvent.setup();

    renderReplies(currentGeneration, [
      reply(
        "55555555-5555-4555-8555-555555555555",
        "Новый активный вариант.",
        "draft",
        currentGenerationId,
      ),
      reply(
        "66666666-6666-4666-8666-666666666666",
        "Ранее одобренное решение.",
        "approved",
        oldGenerationId,
      ),
      reply(
        "77777777-7777-4777-8777-777777777777",
        "Legacy-решение.",
        "rejected",
        null,
      ),
      reply(
        "88888888-8888-4888-8888-888888888888",
        "Устаревший черновик не показываем.",
        "draft",
        oldGenerationId,
      ),
    ]);

    expect(screen.getByText("Новый активный вариант.")).toBeInTheDocument();
    expect(screen.queryByText("Устаревший черновик не показываем.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сгенерировать новые варианты" })).toBeInTheDocument();

    expect(screen.getByText("gpt-5.6-luna")).toBeInTheDocument();
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("268 вход / 168 выход")).toBeInTheDocument();

    const history = screen.getByText("История решений").closest("details");
    expect(history).not.toHaveAttribute("open");

    await user.click(screen.getByText("История решений"));

    expect(history).toHaveAttribute("open");
    expect(screen.getByText("Ранее одобренное решение.")).toBeInTheDocument();
    expect(screen.getByText("Legacy-решение.")).toBeInTheDocument();
    expect(screen.getByText("Ранее сохранённый ответ")).toBeInTheDocument();
  });
});
