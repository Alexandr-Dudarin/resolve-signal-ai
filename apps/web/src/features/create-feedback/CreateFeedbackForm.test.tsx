import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../shared/api/api-client";
import { CreateFeedbackForm } from "./CreateFeedbackForm";

vi.mock("../../shared/api/api-client", () => ({
  api: {
    createFeedback: vi.fn(),
    analyze: vi.fn(),
  },
}));

const createdFeedback = {
  id: "99999999-9999-4999-8999-999999999999",
  source: "manual" as const,
  externalId: null,
  rating: null,
  text: "Доставка прибыла позже обещанного срока.",
  authorName: null,
  customerRef: null,
  status: "new" as const,
  createdAt: "2026-08-30T15:00:00.000Z",
  updatedAt: "2026-08-30T15:00:00.000Z",
  latestAnalysis: null,
  suggestedReplies: [],
};

function RouteProbe() {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
}

describe("CreateFeedbackForm", () => {
  beforeEach(() => {
    vi.mocked(api.createFeedback).mockReset();
    vi.mocked(api.analyze).mockReset();
  });

  it("keeps the created feedback and reports analysis failure separately", async () => {
    vi.mocked(api.createFeedback).mockResolvedValue(createdFeedback);
    vi.mocked(api.analyze).mockRejectedValue(new Error("Mock analysis unavailable"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/feedback/new"]}>
          <Routes>
            <Route path="/feedback/new" element={<CreateFeedbackForm />} />
            <Route path="/feedback/:id" element={<RouteProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByRole("textbox", { name: /Текст обращения/i }), createdFeedback.text);
    await user.click(screen.getByRole("button", { name: /Добавить обращение/i }));

    expect(await screen.findByText('{"analysisFailed":true}')).toBeInTheDocument();
    expect(api.createFeedback).toHaveBeenCalledTimes(1);
    expect(api.analyze).toHaveBeenCalledWith(createdFeedback.id);
  });

  it("shows Russian validation feedback without calling the API", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/feedback/new"]}>
          <CreateFeedbackForm />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Добавить обращение/i }));

    expect(await screen.findByText("Введите от 5 до 5 000 символов.")).toBeInTheDocument();
    expect(api.createFeedback).not.toHaveBeenCalled();
  });
});
