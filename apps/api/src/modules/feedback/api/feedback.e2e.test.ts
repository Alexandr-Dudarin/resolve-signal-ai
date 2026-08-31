import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  CreateFeedbackInput,
  FeedbackDetails,
  FeedbackListQuery,
  FeedbackStatus,
  SuggestedReply,
  UpdateReplyInput,
} from "@resolve-signal/contracts";
import { MockProvider } from "../../ai/infrastructure/mock.provider.js";
import { LLM_PROVIDER, type AnalysisResult } from "../../ai/ports/llm-provider.js";
import { FeedbackService } from "../application/feedback.service.js";
import { FEEDBACK_REPOSITORY, type FeedbackRepository } from "../domain/feedback.repository.js";
import { HealthController } from "../../health/health.controller.js";
import { FeedbackController } from "./feedback.controller.js";

class MemoryFeedbackRepository implements FeedbackRepository {
  private items: FeedbackDetails[] = [];

  async create(input: CreateFeedbackInput) {
    const now = new Date("2026-08-30T15:00:00.000Z").toISOString();
    const item: FeedbackDetails = {
      id: "99999999-9999-4999-8999-999999999999",
      externalId: input.externalId ?? null,
      rating: input.rating ?? null,
      authorName: input.authorName ?? null,
      customerRef: input.customerRef ?? null,
      source: input.source,
      text: input.text,
      status: "new",
      createdAt: now,
      updatedAt: now,
      latestAnalysis: null,
      suggestedReplies: [],
    };
    this.items.push(item);
    return item;
  }

  async list(query: FeedbackListQuery) {
    return { items: this.items, total: this.items.length, page: query.page, pageSize: query.pageSize };
  }
  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async saveAnalysis(feedbackId: string, result: AnalysisResult) {
    const { metadata, ...analysis } = result;
    return {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      feedbackId,
      ...analysis,
      ...metadata,
      createdAt: new Date("2026-08-30T15:00:01.000Z").toISOString(),
    };
  }
  async saveReplies() {
    return [];
  }
  async updateStatus(id: string, status: FeedbackStatus) {
    const item = await this.findById(id);
    if (item) item.status = status;
    return item;
  }
  async updateReply(id: string, input: UpdateReplyInput): Promise<SuggestedReply | null> {
    void id;
    void input;
    return null;
  }
  async allForDashboard() {
    return { items: this.items, total: this.items.length, page: 1, pageSize: 100 };
  }
}

describe("feedback HTTP API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, FeedbackController],
      providers: [
        FeedbackService,
        { provide: FEEDBACK_REPOSITORY, useClass: MemoryFeedbackRepository },
        { provide: LLM_PROVIDER, useClass: MockProvider },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it("exposes the health endpoint", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok", service: "resolve-signal-api" });
  });

  it("validates and creates feedback through the shared schema", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/feedback")
      .send({ text: "Delivery arrived late.", rating: 3 })
      .expect(201);
    expect(created.body).toMatchObject({ source: "manual", status: "new", rating: 3 });

    await request(app.getHttpServer())
      .post("/api/v1/feedback")
      .send({ text: "bad", rating: 8 })
      .expect(400);
  });

  it("rejects malformed route identifiers before repository access", async () => {
    await request(app.getHttpServer()).get("/api/v1/feedback/not-a-uuid").expect(400);
    await request(app.getHttpServer()).post("/api/v1/feedback/not-a-uuid/analyze").expect(400);
  });
});
