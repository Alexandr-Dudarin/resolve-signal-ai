import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../shared/api/api-client";
import { AnalyzeFeedbackButton } from "./AnalyzeFeedbackButton";

vi.mock("../../shared/api/api-client", () => ({ api: { analyze: vi.fn() } }));
beforeEach(() => { vi.mocked(api.analyze).mockReset(); });

describe("AnalyzeFeedbackButton quota errors", () => {
  it.each([
    ["ip_minute", "Слишком много AI-запросов за короткое время."],
    ["ip_day", "Вы исчерпали суточный лимит AI-запросов."],
    ["global_day", "На сегодня исчерпан общий лимит AI-запросов демо."],
  ])("shows %s details without automatic mutation retries", async (scope, message) => {
    vi.mocked(api.analyze).mockRejectedValue(Object.assign(new Error("quota"), {
      aiUsageLimit: { code: "AI_USAGE_LIMIT_EXCEEDED", scope, retryAfterSeconds: 42 },
    }));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: 2, retryDelay: 0 } } });
    const user = userEvent.setup();
    render(<QueryClientProvider client={client}><AnalyzeFeedbackButton feedbackId="test-id" /></QueryClientProvider>);
    await user.click(screen.getByRole("button", { name: "Запустить AI-анализ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(`${message} Попробуйте через 42 сек.`);
    expect(api.analyze).toHaveBeenCalledTimes(1);
    client.clear();
  });
});
