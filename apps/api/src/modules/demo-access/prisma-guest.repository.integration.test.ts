import "reflect-metadata";
import { randomBytes, randomUUID } from "node:crypto";
import type { ServerResponse } from "node:http";
import { CreateFeedbackSchema } from "@resolve-signal/contracts";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaService } from "../../app/prisma.service.js";
import { getApiEnv } from "../../app/env.js";
import type { DemoRequest } from "./demo-access.config.js";
import { GuestAccessService } from "./guest-access.service.js";
import { PrismaGuestRepository } from "./prisma-guest.repository.js";

const url = process.env.GUEST_TEST_DATABASE_URL;
const config = getApiEnv({
  DATABASE_URL: url ?? "postgresql://test:test@localhost/resolve_signal_demo_test", NODE_ENV: "test",
  DEMO_ACCESS_ENABLED: "true", DEMO_ACCESS_MODE: "guest", DEMO_GUEST_MAX_RECORDS: "2",
  DEMO_GUEST_RECORDS_PER_SESSION: "2", DEMO_GUEST_AI_OPERATIONS_PER_RECORD: "2",
  DEMO_SESSION_SECRET: "TestOnlySecret_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
});
const policy = { maximum: 2, perOwner: 2, retentionHours: 24 };
const input = CreateFeedbackSchema.parse({ text: "Вымышленное обращение для изолированного теста" });

// Real PostgreSQL only. This suite deliberately owns/cleans the guest namespace in
// the disposable local test database; it must never run against Neon or dev data.
describe.skipIf(!url)("guest persistence and concurrent caps in isolated PostgreSQL", () => {
  let prisma: PrismaClient;
  let repository: PrismaGuestRepository;
  let owner: string;
  const legacyId = randomUUID();
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !["localhost", "127.0.0.1"].includes(parsed.hostname)
      || parsed.pathname !== "/resolve_signal_demo_test" || parsed.searchParams.has("host") || parsed.searchParams.has("options")) {
      throw new Error("GUEST_TEST_DATABASE_URL must target disposable local resolve_signal_demo_test");
    }
    prisma = new PrismaClient({ datasourceUrl: url });
    repository = new PrismaGuestRepository(prisma as PrismaService);
    await prisma.feedbackItem.create({ data: { ...input, id: legacyId, createdAt: new Date("2020-01-01") } });
  });
  beforeEach(async () => {
    await prisma.feedbackItem.deleteMany({ where: { guestOwnerKey: { not: null } } });
    await prisma.demoGuestSession.deleteMany();
    owner = randomBytes(32).toString("hex");
    await repository.createSession(owner, 3600, 100);
  });
  afterAll(async () => {
    if (!prisma) return;
    await prisma.feedbackItem.deleteMany({ where: { OR: [{ guestOwnerKey: { not: null } }, { id: legacyId }] } });
    await prisma.demoGuestSession.deleteMany();
    await prisma.$disconnect();
  });

  it("survives service recreation, uses a one-way verifier, revokes replay and sets production cookie attributes", async () => {
    const service = new GuestAccessService({ ...config, NODE_ENV: "production" }, repository);
    let cookie = "";
    const response = { setHeader: (_name: string, value: string) => { cookie = value; } } as unknown as ServerResponse;
    await service.start({ headers: {} } as DemoRequest, response);
    expect(cookie).toMatch(/^__Host-resolve_guest=/); expect(cookie).toContain("; Secure"); expect(cookie).toContain("; HttpOnly;");
    expect(cookie).not.toContain("Domain=");
    const request = { headers: { cookie: cookie.split(";")[0] } } as DemoRequest;
    const restarted = new GuestAccessService({ ...config, NODE_ENV: "production" }, new PrismaGuestRepository(prisma as PrismaService));
    const actor = await restarted.resolve(request);
    expect(actor).not.toBeNull();
    expect(cookie).not.toContain(actor!.ownerKey);
    await restarted.logout(request, response);
    expect(await service.resolve(request)).toBeNull(); expect(cookie).toContain("Max-Age=0");
  });

  it("atomically caps global rows and per-owner rows under concurrent creation", async () => {
    const attempts = await Promise.all(Array.from({ length: 8 }, () => repository.createFeedback(input, owner, policy)));
    expect(attempts.filter((x) => x && "id" in x)).toHaveLength(2);
    expect(await prisma.feedbackItem.count({ where: { guestOwnerKey: owner } })).toBe(2);
    const other = randomBytes(32).toString("hex"); await repository.createSession(other, 3600, 100);
    expect(await repository.createFeedback(input, other, policy)).toMatchObject({ scope: "guest_records" });
    expect(await repository.createFeedback(input, owner, { ...policy, maximum: 100 })).toMatchObject({ scope: "guest_owner_records" });
  });

  it("bounds AI history reservations atomically and never reserves for another owner or legacy record", async () => {
    const created = await repository.createFeedback(input, owner, policy);
    if (!created || !("id" in created)) throw new Error("Expected created fixture");
    const results = await Promise.all(Array.from({ length: 12 }, () => repository.reserveAiOperation(created.id, owner, 2)));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(await repository.reserveAiOperation(created.id, "b".repeat(64), 100)).toBe(false);
    expect(await repository.reserveAiOperation(legacyId, owner, 100)).toBe(false);
    expect((await prisma.feedbackItem.findUniqueOrThrow({ where: { id: created.id } })).guestAiOperations).toBe(2);
  });

  it("cleans only expired guest rows and their history while preserving every pre-existing field", async () => {
    const before = await prisma.feedbackItem.findUniqueOrThrow({ where: { id: legacyId } });
    const created = await repository.createFeedback(input, owner, policy);
    if (!created || !("id" in created)) throw new Error("Expected created fixture");
    const analysis = await prisma.feedbackAnalysis.create({ data: {
      feedbackId: created.id, sentiment: "neutral", category: "other", severity: "low", summary: "Тест", problems: [],
      provider: "mock", model: "test", promptVersion: "test",
    } });
    const generation = await prisma.replyGeneration.create({ data: { feedbackId: created.id, analysisId: analysis.id, provider: "mock", model: "test", promptVersion: "test" } });
    await prisma.suggestedReply.create({ data: { feedbackId: created.id, analysisId: analysis.id, generationId: generation.id, text: "Тестовый ответ", status: "approved" } });
    await prisma.feedbackItem.update({ where: { id: created.id }, data: { guestExpiresAt: new Date(Date.now() - 1000) } });
    expect(await repository.reserveAiOperation(created.id, owner, 20)).toBe(false);
    await repository.createFeedback(input, owner, policy);
    expect(await prisma.feedbackItem.findUnique({ where: { id: created.id } })).toBeNull();
    expect(await prisma.feedbackAnalysis.count({ where: { feedbackId: created.id } })).toBe(0);
    expect(await prisma.replyGeneration.count({ where: { feedbackId: created.id } })).toBe(0);
    expect(await prisma.suggestedReply.count({ where: { feedbackId: created.id } })).toBe(0);
    expect(await prisma.feedbackItem.findUnique({ where: { id: legacyId } })).toEqual(before);
  });

  it("caps sessions atomically, prunes expired sessions and rejects a revoked creator", async () => {
    await prisma.demoGuestSession.deleteMany();
    const attempts = await Promise.all(Array.from({ length: 8 }, () => repository.createSession(randomBytes(32).toString("hex"), 3600, 2)));
    expect(attempts.filter(Boolean)).toHaveLength(2);
    await prisma.demoGuestSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await repository.createSession(owner, 3600, 2)).not.toBeNull();
    expect(await prisma.demoGuestSession.count()).toBe(1);
    await repository.revokeSession(owner);
    expect(await repository.createFeedback(input, owner, policy)).toBeNull();
  });

  it("enforces additive metadata constraints and prevents guest tagging of all five protected IDs", async () => {
    await expect(prisma.feedbackItem.create({ data: { ...input, guestOwnerKey: owner } })).rejects.toThrow();
    await expect(prisma.feedbackItem.create({ data: { ...input, guestExpiresAt: new Date() } })).rejects.toThrow();
    for (let i = 1; i <= 5; i++) {
      const id = `90000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
      // UPDATE verifies the constraint even when the example already exists.
      const exists = await prisma.feedbackItem.findUnique({ where: { id } });
      if (exists) {
        await expect(prisma.feedbackItem.update({ where: { id }, data: { guestOwnerKey: owner, guestExpiresAt: new Date(Date.now() + 60000) } })).rejects.toThrow();
        expect(await prisma.feedbackItem.findUnique({ where: { id } })).toEqual(exists);
      } else {
        await expect(prisma.feedbackItem.create({ data: { ...input, id, guestOwnerKey: owner, guestExpiresAt: new Date(Date.now() + 60000) } })).rejects.toThrow();
      }
    }
  });
});
