import "reflect-metadata";
import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
import { AiUsageLimiter } from "../../ai-usage/application/ai-usage-limiter.js";
import { FeedbackService } from "../application/feedback.service.js";
import { FEEDBACK_REPOSITORY, type FeedbackRepository } from "../domain/feedback.repository.js";
import { HealthController } from "../../health/health.controller.js";
import { FeedbackController } from "./feedback.controller.js";

class MemoryFeedbackRepository implements FeedbackRepository {
  private items: FeedbackDetails[] = [];

  async create(input: CreateFeedbackInput) {
    const now = new Date("2026-08-30T15:00:00.000Z").toISOString();
    const item: FeedbackDetails = {
      id: randomUUID(),
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
      currentReplyGeneration: null,
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
  const reserveAiUsage = vi.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, FeedbackController],
      providers: [
        FeedbackService,
        { provide: FEEDBACK_REPOSITORY, useClass: MemoryFeedbackRepository },
        { provide: LLM_PROVIDER, useClass: MockProvider },
        {
          provide: AiUsageLimiter,
          useValue: { reserve: reserveAiUsage },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("Test API").build()));
    await app.init();
  });

  afterAll(async () => app.close());

  it("exposes the health endpoint", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok", service: "resolve-signal-api" });
  });

  it("documents the typed 429 response and Retry-After on both AI endpoints", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
    for (const operation of ["analyze", "replies"]) {
      const limited = response.body.paths[`/api/v1/feedback/{id}/${operation}`].post.responses["429"];
      expect(limited.headers["Retry-After"].schema).toMatchObject({ type: "integer", minimum: 0 });
      expect(limited.content["application/json"].schema.required).toEqual(["code", "scope", "retryAfterSeconds"]);
    }
    await request(app.getHttpServer()).get("/api/docs/").expect(200);
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
    reserveAiUsage.mockClear();

    await request(app.getHttpServer()).get("/api/v1/feedback/not-a-uuid").expect(400);
    await request(app.getHttpServer()).post("/api/v1/feedback/not-a-uuid/analyze").expect(400);

    expect(reserveAiUsage).not.toHaveBeenCalled();
  });

  it("persists only normalized plain text, without invoking AI", async () => {
    reserveAiUsage.mockClear();
    const created = await request(app.getHttpServer())
      .post("/api/v1/feedback")
      .send({ text: '<b>Товар хороший</b>\r\n<img src=x onerror=alert(1)><script>alert(1)</script><style>bad</style>\u0000' })
      .expect(201);
    expect(created.body.text).toBe("Товар хороший");

    const saved = await request(app.getHttpServer())
      .get(`/api/v1/feedback/${created.body.id}`).expect(200);
    expect(saved.body.text).toBe("Товар хороший");
    expect(reserveAiUsage).not.toHaveBeenCalled();
  });

  it("validates empty and min/max text length after normalization", async () => {
    reserveAiUsage.mockClear();
    const before = await request(app.getHttpServer()).get("/api/v1/feedback").expect(200);
    for (const text of ["<script>alert(1)</script><img src=x>", "<b>1234</b>", `<b>${"a".repeat(5001)}</b>`]) {
      await request(app.getHttpServer()).post("/api/v1/feedback").send({ text }).expect(400);
    }
    const after = await request(app.getHttpServer()).get("/api/v1/feedback").expect(200);
    expect(after.body.total).toBe(before.body.total);

    const valid = await request(app.getHttpServer()).post("/api/v1/feedback")
      .send({ text: `<b>${"a".repeat(5000)}</b>` }).expect(201);
    expect(valid.body.text).toBe("a".repeat(5000));
    expect(reserveAiUsage).not.toHaveBeenCalled();
  });
});
