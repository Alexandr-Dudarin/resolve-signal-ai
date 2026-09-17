import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../shared/api/api-client";
import { GenerateRepliesButton } from "./GenerateRepliesButton";

vi.mock("../../shared/api/api-client", () => ({ api: { generateReplies: vi.fn() } }));
beforeEach(() => { vi.mocked(api.generateReplies).mockReset(); });

describe("GenerateRepliesButton quota errors", () => {
  it.each([
    ["ip_minute", "Слишком много AI-запросов за короткое время."],
    ["ip_day", "Вы исчерпали суточный лимит AI-запросов."],
    ["global_day", "На сегодня исчерпан общий лимит AI-запросов демо."],
  ])("explains %s and keeps existing drafts without retries", async (scope, message) => {
    vi.mocked(api.generateReplies).mockRejectedValue(Object.assign(new Error("quota"), {
      aiUsageLimit: { code: "AI_USAGE_LIMIT_EXCEEDED", scope, retryAfterSeconds: 14820 },
    }));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 2, retryDelay: 0 } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={client}><GenerateRepliesButton feedbackId="test-id" hasCurrentGeneration /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Сгенерировать новые варианты" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(`${message} Попробуйте через 4 ч 7 мин.`);
    expect(screen.getByRole("alert")).toHaveTextContent("Существующий AI-анализ и черновики сохранены.");
    expect(api.generateReplies).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
