import type { PrismaClient, Prisma } from "@prisma/client";

// Synthetic examples only; none claim an AI analysis that was never performed.
export const publicDemoFeedback: Prisma.FeedbackItemCreateManyInput[] = [
  { id: "90000000-0000-4000-8000-000000000001", source: "manual", text: "Демо: оплата заказа прошла дважды. Прошу проверить повторное списание и объяснить порядок возврата.", rating: 1 },
  { id: "90000000-0000-4000-8000-000000000002", source: "store_review", text: "Демо: светильник пришёл вовремя. Установка простая, качество понравилось. Спасибо за удобную инструкцию!", rating: 5 },
  { id: "90000000-0000-4000-8000-000000000003", source: "support", text: "Демо: доставка задержалась на четыре дня. Сам товар хороший, но хотелось бы получать обновления статуса.", rating: 3 },
  { id: "90000000-0000-4000-8000-000000000004", source: "web_form", text: "Демо: не удаётся войти в личный кабинет. После смены пароля снова появляется сообщение об ошибке.", rating: 2 },
  { id: "90000000-0000-4000-8000-000000000005", source: "manual", text: "Демо: подскажите, можно ли изменить адрес доставки до отправки заказа? Пока не нашёл такую возможность." },
].map((item) => ({ ...item, source: item.source as Prisma.FeedbackItemCreateManyInput["source"], authorName: "Демо-клиент", createdAt: new Date("2026-10-16T12:00:00.000Z") }));

export async function initializePublicDemo(prisma: Pick<PrismaClient, "feedbackItem">) {
  // No upsert/update: reruns preserve edits to examples as well as all other rows.
  return prisma.feedbackItem.createMany({ data: publicDemoFeedback, skipDuplicates: true });
}
