import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  FeedbackAnalysisSchema,
  type CreateFeedbackInput,
  type FeedbackDetails,
  type FeedbackListItem,
  type FeedbackListQuery,
  type FeedbackListResponse,
  type FeedbackStatus,
  type PersistedFeedbackAnalysis,
  type SuggestedReply,
  type UpdateReplyInput,
} from "@resolve-signal/contracts";
import { PrismaService } from "../../../app/prisma.service.js";
import type { AnalysisResult, GeneratedReply } from "../../ai/ports/llm-provider.js";
import type { FeedbackRepository } from "../domain/feedback.repository.js";

function mapAnalysis(row: any): PersistedFeedbackAnalysis {
  const parsed = FeedbackAnalysisSchema.parse({
    sentiment: row.sentiment,
    severity: row.severity,
    category: row.category,
    summary: row.summary,
    problems: row.problems,
  });
  return {
    id: row.id,
    feedbackId: row.feedbackId,
    ...parsed,
    provider: row.provider,
    model: row.model,
    promptVersion: row.promptVersion,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapReply(row: any): SuggestedReply {
  return {
    id: row.id,
    feedbackId: row.feedbackId,
    analysisId: row.analysisId,
    tone: row.tone,
    text: row.text,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapFeedback(row: any): FeedbackListItem {
  return {
    id: row.id,
    source: row.source,
    externalId: row.externalId,
    rating: row.rating,
    text: row.text,
    authorName: row.authorName,
    customerRef: row.customerRef,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    latestAnalysis: row.analyses?.[0] ? mapAnalysis(row.analyses[0]) : null,
  };
}

function mapDetails(row: any): FeedbackDetails {
  return {
    ...mapFeedback(row),
    suggestedReplies: (row.replies ?? []).map(mapReply),
  };
}

const detailsInclude = {
  analyses: { orderBy: { createdAt: "desc" as const }, take: 1 },
  replies: { orderBy: { createdAt: "desc" as const } },
};

@Injectable()
export class PrismaFeedbackRepository implements FeedbackRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(input: CreateFeedbackInput): Promise<FeedbackDetails> {
    const row = await this.prisma.feedbackItem.create({
      data: input,
      include: detailsInclude,
    });
    return mapDetails(row);
  }

  async list(query: FeedbackListQuery): Promise<FeedbackListResponse> {
    const where: Prisma.FeedbackItemWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.severity || query.category
        ? {
            analyses: {
              some: {
                ...(query.severity ? { severity: query.severity } : {}),
                ...(query.category ? { category: query.category } : {}),
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { text: { contains: query.search, mode: "insensitive" } },
              { authorName: { contains: query.search, mode: "insensitive" } },
              { customerRef: { contains: query.search, mode: "insensitive" } },
              { externalId: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.feedbackItem.findMany({
        where,
        include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.feedbackItem.count({ where }),
    ]);

    return { items: rows.map(mapFeedback), total, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string): Promise<FeedbackDetails | null> {
    const row = await this.prisma.feedbackItem.findUnique({ where: { id }, include: detailsInclude });
    return row ? mapDetails(row) : null;
  }

  async saveAnalysis(feedbackId: string, result: AnalysisResult): Promise<PersistedFeedbackAnalysis> {
    const { metadata, ...analysis } = result;
    const row = await this.prisma.feedbackAnalysis.create({
      data: {
        feedbackId,
        ...analysis,
        ...metadata,
      },
    });
    return mapAnalysis(row);
  }

  async saveReplies(feedbackId: string, analysisId: string, replies: GeneratedReply[]): Promise<SuggestedReply[]> {
    const rows = await this.prisma.$transaction(
      replies.map((reply) =>
        this.prisma.suggestedReply.create({ data: { feedbackId, analysisId, ...reply } }),
      ),
    );
    return rows.map(mapReply);
  }

  async updateStatus(id: string, status: FeedbackStatus): Promise<FeedbackDetails | null> {
    const exists = await this.prisma.feedbackItem.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    const row = await this.prisma.feedbackItem.update({ where: { id }, data: { status }, include: detailsInclude });
    return mapDetails(row);
  }

  async updateReply(id: string, input: UpdateReplyInput): Promise<SuggestedReply | null> {
    const exists = await this.prisma.suggestedReply.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return null;
    const row = await this.prisma.suggestedReply.update({ where: { id }, data: input });
    return mapReply(row);
  }

  async allForDashboard(): Promise<FeedbackListResponse> {
    const rows = await this.prisma.feedbackItem.findMany({
      include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
    return { items: rows.map(mapFeedback), total: rows.length, page: 1, pageSize: rows.length || 1 };
  }
}
