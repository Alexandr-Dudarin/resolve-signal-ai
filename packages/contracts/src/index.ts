import { z } from "zod";

export const feedbackSources = [
  "manual",
  "web_form",
  "support",
  "store_review",
  "api",
] as const;
export const feedbackStatuses = [
  "new",
  "triaged",
  "in_progress",
  "resolved",
  "replied",
] as const;
export const sentiments = ["positive", "neutral", "negative", "mixed"] as const;
export const severities = ["low", "medium", "high", "critical"] as const;
export const feedbackCategories = [
  "product",
  "service",
  "delivery",
  "payment",
  "refund",
  "support",
  "account",
  "other",
] as const;
export const replyStatuses = ["draft", "approved", "rejected"] as const;

export const FeedbackSourceSchema = z.enum(feedbackSources);
export const FeedbackStatusSchema = z.enum(feedbackStatuses);
export const SentimentSchema = z.enum(sentiments);
export const SeveritySchema = z.enum(severities);
export const FeedbackCategorySchema = z.enum(feedbackCategories);
export const ReplyStatusSchema = z.enum(replyStatuses);

export const EntityIdSchema = z.string().uuid();

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => value || undefined);

export const CreateFeedbackSchema = z.object({
  source: FeedbackSourceSchema.default("manual"),
  externalId: optionalTrimmedString(120),
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().trim().min(5).max(5000),
  authorName: optionalTrimmedString(100),
  customerRef: optionalTrimmedString(120),
});

export const FeedbackAnalysisSchema = z.object({
  sentiment: SentimentSchema,
  severity: SeveritySchema,
  category: FeedbackCategorySchema,
  summary: z.string().min(1).max(1000),
  problems: z.array(z.string().min(1).max(240)).max(12),
});

export const PersistedFeedbackAnalysisSchema = FeedbackAnalysisSchema.extend({
  id: EntityIdSchema,
  feedbackId: EntityIdSchema,
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});

export const ReplyGenerationSchema = z.object({
  id: EntityIdSchema,
  feedbackId: EntityIdSchema,
  analysisId: EntityIdSchema,
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  supersededAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const SuggestedReplySchema = z.object({
  id: EntityIdSchema,
  feedbackId: EntityIdSchema,
  analysisId: EntityIdSchema,
  generationId: EntityIdSchema.nullable(),
  tone: z.string().nullable(),
  originalText: z.string().min(1).max(5000).nullable(),
  text: z.string().min(1).max(5000),
  status: ReplyStatusSchema,
  editedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const FeedbackListItemSchema = z.object({
  id: EntityIdSchema,
  source: FeedbackSourceSchema,
  externalId: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  text: z.string(),
  authorName: z.string().nullable(),
  customerRef: z.string().nullable(),
  status: FeedbackStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  latestAnalysis: PersistedFeedbackAnalysisSchema.nullable(),
});

export const FeedbackDetailsSchema = FeedbackListItemSchema.extend({
  currentReplyGeneration: ReplyGenerationSchema.nullable(),
  suggestedReplies: z.array(SuggestedReplySchema),
});

export const FeedbackListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: FeedbackStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  category: FeedbackCategorySchema.optional(),
  source: FeedbackSourceSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const FeedbackListResponseSchema = z.object({
  items: z.array(FeedbackListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});

export const UpdateFeedbackStatusSchema = z.object({
  status: FeedbackStatusSchema,
});

export const GenerateRepliesSchema = z.object({
  tones: z.array(z.string().trim().min(1).max(40)).min(1).max(3).default(["empathetic"]),
});

export const UpdateReplySchema = z
  .object({
    text: z.string().trim().min(1).max(5000).optional(),
    status: ReplyStatusSchema.optional(),
  })
  .refine((value) => value.text !== undefined || value.status !== undefined, {
    message: "At least one reply field must be provided",
  });

export const DashboardSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
  critical: z.number().int().nonnegative(),
  awaitingReview: z.number().int().nonnegative(),
  analyzed: z.number().int().nonnegative(),
  sentiment: z.array(z.object({ key: SentimentSchema, count: z.number().int().nonnegative() })),
  severity: z.array(z.object({ key: SeveritySchema, count: z.number().int().nonnegative() })),
  recentFeedback: z.array(FeedbackListItemSchema),
});

export type FeedbackSource = z.infer<typeof FeedbackSourceSchema>;
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;
export type Sentiment = z.infer<typeof SentimentSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type FeedbackCategory = z.infer<typeof FeedbackCategorySchema>;
export type ReplyStatus = z.infer<typeof ReplyStatusSchema>;
export type CreateFeedbackInput = z.infer<typeof CreateFeedbackSchema>;
export type FeedbackAnalysis = z.infer<typeof FeedbackAnalysisSchema>;
export type PersistedFeedbackAnalysis = z.infer<typeof PersistedFeedbackAnalysisSchema>;
export type ReplyGeneration = z.infer<typeof ReplyGenerationSchema>;
export type SuggestedReply = z.infer<typeof SuggestedReplySchema>;
export type FeedbackListItem = z.infer<typeof FeedbackListItemSchema>;
export type FeedbackDetails = z.infer<typeof FeedbackDetailsSchema>;
export type FeedbackListQuery = z.infer<typeof FeedbackListQuerySchema>;
export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>;
export type UpdateFeedbackStatusInput = z.infer<typeof UpdateFeedbackStatusSchema>;
export type GenerateRepliesInput = z.infer<typeof GenerateRepliesSchema>;
export type UpdateReplyInput = z.infer<typeof UpdateReplySchema>;
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
