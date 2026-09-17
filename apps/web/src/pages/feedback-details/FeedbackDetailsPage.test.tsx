import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { FeedbackDetails } from "@resolve-signal/contracts";
import { api } from "../../shared/api/api-client";
import { FeedbackTable } from "../../widgets/feedback-table/FeedbackTable";
import { FeedbackDetailsPage } from "./FeedbackDetailsPage";

vi.mock("../../shared/api/api-client", () => ({ api: { feedback: vi.fn() } }));

const payload = '<b>Товар хороший</b><img src="https://example.com/x" onerror="alert(1)"><script>alert(1)</script>';
const feedback: FeedbackDetails = {
  id: "11111111-1111-4111-8111-111111111111", source: "manual", externalId: null, rating: null,
  authorName: "Клиент", customerRef: null, status: "new", text: payload,
  createdAt: "2026-09-17T12:00:00.000Z", updatedAt: "2026-09-17T12:00:00.000Z",
  latestAnalysis: null, currentReplyGeneration: null, suggestedReplies: [],
};

describe("feedback plain-text rendering", () => {
  it("renders legacy malicious markup as text in details and creates no image or script elements", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    vi.mocked(api.feedback).mockResolvedValue(feedback);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[`/feedback/${feedback.id}`]}>
      <Routes><Route path="/feedback/:id" element={<FeedbackDetailsPage />} /></Routes>
    </MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText(`“${payload}”`)).toBeInTheDocument();
    expect(container.querySelectorAll("script, img")).toHaveLength(0);
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
    client.clear();
  });

  it("keeps table and responsive-card feedback as text, without remote images", () => {
    const { container } = render(<MemoryRouter><FeedbackTable items={[feedback]} /></MemoryRouter>);
    expect(screen.getAllByText(payload)).toHaveLength(2);
    expect(container.querySelectorAll("script, img")).toHaveLength(0);
  });
});
