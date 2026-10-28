import type { Prisma, PrismaClient } from "@prisma/client";

type ShowcaseExample = {
  feedback: Prisma.FeedbackItemUncheckedCreateInput;
  analysis: Prisma.FeedbackAnalysisUncheckedCreateInput;
  replies: Prisma.SuggestedReplyCreateManyInput[];
};

// Prepared synthetic examples, not results obtained from the production OpenAI
// provider. The stored provenance remains provider=mock / model=resolve-mock-v1.
// These IDs and content match the existing local-development seed exactly.
export const publicDemoShowcase: ShowcaseExample[] = [
  {
    feedback: {
      id: "33333333-3333-4333-8333-333333333333",
      source: "web_form",
      externalId: "FDB-184",
      rating: 1,
      text: "Деньги списали дважды, а поддержка не отвечает уже три дня.",
      authorName: "София Волкова",
      customerRef: "CUS-184",
      status: "new",
      createdAt: new Date("2026-08-30T14:32:10.000Z"),
    },
    analysis: {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      feedbackId: "33333333-3333-4333-8333-333333333333",
      sentiment: "negative",
      severity: "critical",
      category: "payment",
      summary: "Клиент сообщает о повторном списании и отсутствии ответа поддержки в течение трёх дней — это критическая проблема оплаты и коммуникации.",
      problems: ["повторное списание", "поддержка не отвечает"],
      provider: "mock",
      model: "resolve-mock-v1",
      promptVersion: "mock-analysis-v1",
      inputTokens: 16,
      outputTokens: 40,
    },
    replies: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        feedbackId: "33333333-3333-4333-8333-333333333333",
        analysisId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        tone: "empathetic",
        status: "draft",
        text: "Здравствуйте, София!\n\nСпасибо, что сообщили нам об этой ситуации. Нам очень жаль, что средства были списаны повторно, а ответа поддержки пришлось ждать. Мы передали платёж на срочную проверку и сообщим вам о следующих шагах как можно скорее.\n\nПонимаем, насколько это неприятно, и благодарим за терпение, пока мы решаем вопрос.",
      },
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        feedbackId: "33333333-3333-4333-8333-333333333333",
        analysisId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        tone: "concise",
        status: "draft",
        text: "Здравствуйте, София! Приносим извинения за повторное списание и задержку ответа. Мы передали вопрос на срочную проверку и скоро сообщим о следующих шагах.",
      },
    ],
  },
  {
    feedback: {
      id: "22222222-2222-4222-8222-222222222222",
      source: "support",
      rating: 3,
      text: "Товар хороший, но доставка задержалась на четыре дня, а статус отслеживания ни разу не обновился.",
      authorName: "Дмитрий Соколов",
      customerRef: "CUS-2281",
      status: "triaged",
      createdAt: new Date("2026-08-29T11:40:00.000Z"),
    },
    analysis: {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      feedbackId: "22222222-2222-4222-8222-222222222222",
      sentiment: "mixed",
      severity: "medium",
      category: "delivery",
      summary: "Клиент доволен товаром, но сообщает о заметной задержке доставки и отсутствии обновлений статуса.",
      problems: ["задержка доставки", "нет актуальной информации об отслеживании"],
      provider: "mock",
      model: "resolve-mock-v1",
      promptVersion: "mock-analysis-v1",
      inputTokens: 24,
      outputTokens: 38,
    },
    replies: [],
  },
  {
    feedback: {
      id: "11111111-1111-4111-8111-111111111111",
      source: "store_review",
      rating: 5,
      text: "Новый рабочий светильник отлично сделан, а установка заняла всего пару минут. Прекрасный продукт и сервис.",
      authorName: "Анна Смирнова",
      customerRef: "CUS-1042",
      status: "replied",
      createdAt: new Date("2026-08-28T09:15:00.000Z"),
    },
    analysis: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      feedbackId: "11111111-1111-4111-8111-111111111111",
      sentiment: "positive",
      severity: "low",
      category: "product",
      summary: "Клиент высоко оценивает качество продукта и простую установку.",
      problems: [],
      provider: "mock",
      model: "resolve-mock-v1",
      promptVersion: "mock-analysis-v1",
      inputTokens: 21,
      outputTokens: 31,
    },
    replies: [{
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      feedbackId: "11111111-1111-4111-8111-111111111111",
      analysisId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      tone: "warm",
      status: "approved",
      text: "Анна, спасибо за отзыв! Мы рады, что вам понравились светильник и простая установка. Для нашей команды очень важна ваша обратная связь.",
    }],
  },
];

/**
 * Insert-only showcase initialization. Never updates, deletes, adopts or
 * backfills existing feedback, analysis, reply or guest ownership data.
 * Missing rows are inserted atomically; unexpected colliding IDs abort.
 */
export async function initializePublicDemoShowcase(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.feedbackItem.findMany({
      where: { id: { in: publicDemoShowcase.map((item) => item.feedback.id!) } },
      include: {
        analyses: {
          where: { id: { in: publicDemoShowcase.map((item) => item.analysis.id!) } },
          select: { id: true, provider: true, model: true },
        },
        replies: {
          where: { id: { in: publicDemoShowcase.flatMap((item) => item.replies.map((reply) => reply.id!)) } },
          select: { id: true },
        },
      },
    });

    const existing = new Map(current.map((item) => [item.id, item]));
    // Check every existing row BEFORE inserting the first missing fixture.
    for (const fixture of publicDemoShowcase) {
      const row = existing.get(fixture.feedback.id!);
      if (!row) continue;
      if (row.source !== fixture.feedback.source ||
          row.text !== fixture.feedback.text ||
          row.authorName !== fixture.feedback.authorName ||
          row.customerRef !== (fixture.feedback.customerRef ?? null) ||
          row.externalId !== (fixture.feedback.externalId ?? null) ||
          row.rating !== (fixture.feedback.rating ?? null) ||
          row.status !== fixture.feedback.status ||
          row.guestOwnerKey !== null || row.guestExpiresAt !== null ||
          row.analyses.length !== 1 ||
          row.analyses[0]?.id !== fixture.analysis.id ||
          row.analyses[0]?.provider !== "mock" ||
          row.analyses[0]?.model !== "resolve-mock-v1" ||
          fixture.replies.some((reply) => !row.replies.some((existingReply) => existingReply.id === reply.id))) {
        throw new Error("Showcase fixture collision or incomplete history; no records inserted");
      }
    }

    let created = 0;
    for (const fixture of publicDemoShowcase) {
      if (existing.has(fixture.feedback.id!)) continue;
      await tx.feedbackItem.create({ data: fixture.feedback });
      await tx.feedbackAnalysis.create({ data: fixture.analysis });
      if (fixture.replies.length) {
        await tx.suggestedReply.createMany({ data: fixture.replies });
      }
      created++;
    }
    return { created, unchanged: publicDemoShowcase.length - created };
  });
}
