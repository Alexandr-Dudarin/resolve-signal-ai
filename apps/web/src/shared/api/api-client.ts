import {
  AiRuntimeStatusSchema,
  AiUsageLimitErrorSchema,
  DashboardSummarySchema,
  FeedbackDetailsSchema,
  FeedbackListResponseSchema,
  PersistedFeedbackAnalysisSchema,
  SuggestedReplySchema,
  type CreateFeedbackInput,
  type FeedbackListQuery,
  type FeedbackStatus,
  type GenerateRepliesInput,
  type UpdateReplyInput,
  type AiUsageLimitError,
} from "@resolve-signal/contracts";
import { z } from "zod";
import { webEnv } from "../config/env";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly aiUsageLimit?: AiUsageLimitError) {
    super(message);
  }
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${webEnv.VITE_API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const limit = response.status === 429 ? AiUsageLimitErrorSchema.safeParse(payload) : null;
    const message = z.object({ message: z.string() }).safeParse(payload);
    throw new ApiError(
      message.success ? message.data.message : "Не удалось выполнить запрос.",
      response.status,
      limit?.success ? limit.data : undefined,
    );
  }
  return schema.parse(await response.json());
}

function queryString(query: FeedbackListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export const api = {
  aiRuntimeStatus: () => request("/api/v1/ai/runtime-status", AiRuntimeStatusSchema),
  dashboard: () => request("/api/v1/dashboard/summary", DashboardSummarySchema),
  listFeedback: (query: FeedbackListQuery) =>
    request(`/api/v1/feedback?${queryString(query)}`, FeedbackListResponseSchema),
  feedback: (id: string) => request(`/api/v1/feedback/${id}`, FeedbackDetailsSchema),
  createFeedback: (input: CreateFeedbackInput) =>
    request("/api/v1/feedback", FeedbackDetailsSchema, { method: "POST", body: JSON.stringify(input) }),
  analyze: (id: string) =>
    request(`/api/v1/feedback/${id}/analyze`, PersistedFeedbackAnalysisSchema, { method: "POST" }),
  generateReplies: (id: string, input: GenerateRepliesInput) =>
    request(`/api/v1/feedback/${id}/replies`, z.array(SuggestedReplySchema), {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateStatus: (id: string, status: FeedbackStatus) =>
    request(`/api/v1/feedback/${id}/status`, FeedbackDetailsSchema, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updateReply: (id: string, input: UpdateReplyInput) =>
    request(`/api/v1/replies/${id}`, SuggestedReplySchema, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
