import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ids = {
  positive: "11111111-1111-4111-8111-111111111111",
  medium: "22222222-2222-4222-8222-222222222222",
  critical: "33333333-3333-4333-8333-333333333333",
  positiveAnalysis: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  mediumAnalysis: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  criticalAnalysis: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

async function main() {
  await prisma.suggestedReply.deleteMany();
  await prisma.feedbackAnalysis.deleteMany();
  await prisma.feedbackItem.deleteMany();

  await prisma.feedbackItem.create({
    data: {
      id: ids.positive,
      source: "store_review",
      rating: 5,
      text: "Новый рабочий светильник отлично сделан, а установка заняла всего пару минут. Прекрасный продукт и сервис.",
      authorName: "Анна Смирнова",
      customerRef: "CUS-1042",
      status: "replied",
      createdAt: new Date("2026-08-28T09:15:00.000Z"),
      analyses: {
        create: {
          id: ids.positiveAnalysis,
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
      },
    },
  });

  await prisma.feedbackItem.create({
    data: {
      id: ids.medium,
      source: "support",
      rating: 3,
      text: "Товар хороший, но доставка задержалась на четыре дня, а статус отслеживания ни разу не обновился.",
      authorName: "Дмитрий Соколов",
      customerRef: "CUS-2281",
      status: "triaged",
      createdAt: new Date("2026-08-29T11:40:00.000Z"),
      analyses: {
        create: {
          id: ids.mediumAnalysis,
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
      },
    },
  });

  await prisma.feedbackItem.create({
    data: {
      id: ids.critical,
      source: "web_form",
      externalId: "FDB-184",
      rating: 1,
      text: "Деньги списали дважды, а поддержка не отвечает уже три дня.",
      authorName: "София Волкова",
      customerRef: "CUS-184",
      status: "new",
      createdAt: new Date("2026-08-30T14:32:10.000Z"),
      analyses: {
        create: {
          id: ids.criticalAnalysis,
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
      },
    },
  });

  await prisma.suggestedReply.createMany({
    data: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        feedbackId: ids.critical,
        analysisId: ids.criticalAnalysis,
        tone: "empathetic",
        status: "draft",
        text: "Здравствуйте, София!\n\nСпасибо, что сообщили нам об этой ситуации. Нам очень жаль, что средства были списаны повторно, а ответа поддержки пришлось ждать. Мы передали платёж на срочную проверку и сообщим вам о следующих шагах как можно скорее.\n\nПонимаем, насколько это неприятно, и благодарим за терпение, пока мы решаем вопрос.",
      },
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        feedbackId: ids.critical,
        analysisId: ids.criticalAnalysis,
        tone: "concise",
        status: "draft",
        text: "Здравствуйте, София! Приносим извинения за повторное списание и задержку ответа. Мы передали вопрос на срочную проверку и скоро сообщим о следующих шагах.",
      },
      {
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        feedbackId: ids.positive,
        analysisId: ids.positiveAnalysis,
        tone: "warm",
        status: "approved",
        text: "Анна, спасибо за отзыв! Мы рады, что вам понравились светильник и простая установка. Для нашей команды очень важна ваша обратная связь.",
      },
    ],
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
