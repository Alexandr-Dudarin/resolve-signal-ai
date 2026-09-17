import { Injectable } from "@nestjs/common";
import { FeedbackAnalysisSchema } from "@resolve-signal/contracts";
import type { FeedbackAnalysis } from "@resolve-signal/contracts";

import type {
  AnalysisResult,
  GeneratedRepliesResult,
  LLMProvider,
} from "../ports/llm-provider.js";

@Injectable()
export class MockProvider implements LLMProvider {
  async analyzeFeedback(
    feedback: Parameters<LLMProvider["analyzeFeedback"]>[0],
  ): Promise<AnalysisResult> {
    const normalized = feedback.text.toLowerCase();

    const includesAny = (phrases: string[]) =>
      phrases.some((phrase) => normalized.includes(phrase));

    let analysis: FeedbackAnalysis;

    if (
      includesAny([
        "charged twice",
        "duplicate charge",
        "charged two times",
        "списали дважды",
        "двойное списание",
        "повторное списание",
      ])
    ) {
      analysis = {
        sentiment: "negative",
        severity: "critical",
        category: "payment",
        summary:
          "Клиент сообщает о повторном списании и отсутствии ответа поддержки — это критическая проблема оплаты и коммуникации.",
        problems: ["повторное списание", "поддержка не отвечает"],
      };
    } else if (
      includesAny(["delivery", "доставк", "доставили"]) &&
      includesAny(["late", "delay", "опозд", "задерж"])
    ) {
      analysis = {
        sentiment:
          feedback.rating && feedback.rating >= 4
            ? "neutral"
            : "mixed",
        severity: "medium",
        category: "delivery",
        summary:
          "Клиент сообщает о задержке доставки и отсутствии актуальной информации о статусе заказа.",
        problems: [
          "задержка доставки",
          "нет актуальной информации об отслеживании",
        ],
      };
    } else if (
      (feedback.rating && feedback.rating >= 4) ||
      includesAny([
        "great",
        "excellent",
        "love",
        "beautiful",
        "отлич",
        "понрав",
        "красив",
        "удобн",
      ])
    ) {
      analysis = {
        sentiment: "positive",
        severity: "low",
        category: includesAny([
          "service",
          "сервис",
          "обслужив",
        ])
          ? "service"
          : "product",
        summary:
          "Клиент положительно оценивает продукт или качество обслуживания.",
        problems: [],
      };
    } else if (includesAny(["refund", "возврат"])) {
      analysis = {
        sentiment: "negative",
        severity: "high",
        category: "refund",
        summary:
          "Клиент ожидает возврат средств и нуждается в понятном статусе решения.",
        problems: ["задержка возврата средств"],
      };
    } else {
      analysis = {
        sentiment:
          feedback.rating && feedback.rating <= 2
            ? "negative"
            : "neutral",
        severity:
          feedback.rating && feedback.rating <= 2
            ? "high"
            : "low",
        category: "other",
        summary:
          "Обращение клиента требует проверки и понятного последующего ответа.",
        problems: ["требуется ответ клиенту"],
      };
    }

    const parsed = FeedbackAnalysisSchema.parse(analysis);

    const inputTokens = Math.max(
      8,
      Math.ceil(feedback.text.length / 4),
    );

    return {
      ...parsed,
      metadata: {
        provider: "mock",
        model: "resolve-mock-v1",
        promptVersion: "mock-analysis-v1",
        inputTokens,
        outputTokens: 36 + parsed.problems.length * 4,
      },
    };
  }

  async generateReplies(
    feedback: Parameters<LLMProvider["generateReplies"]>[0],
    analysis: Parameters<LLMProvider["generateReplies"]>[1],
    tones: string[],
  ): Promise<GeneratedRepliesResult> {
    const name = feedback.authorName?.split(" ")[0];

    const greeting = name
      ? `Здравствуйте, ${name}!`
      : "Здравствуйте!";

    const replies = tones.map((tone) => ({
      tone,
      text:
        analysis.category === "payment"
          ? tone === "concise"
            ? `${greeting}\n\nПриносим извинения за повторное списание и задержку ответа. Мы передали вопрос на срочную проверку и скоро сообщим о следующих шагах.`
            : `${greeting}\n\nСпасибо, что сообщили нам об этой ситуации. Нам очень жаль, что средства были списаны повторно, а ответа поддержки пришлось ждать. Мы передали платёж на срочную проверку и сообщим вам о следующих шагах как можно скорее.\n\nПонимаем, насколько это неприятно, и благодарим за терпение, пока мы решаем вопрос.`
          : tone === "concise"
            ? `${greeting}\n\nСпасибо за отзыв. Мы уже проверяем проблему «${analysis.problems[0] ?? "требуется дополнительная проверка"}» и скоро сообщим о следующем шаге.`
            : `${greeting}\n\nСпасибо, что поделились обратной связью. Нам жаль, что ваш опыт не оправдал ожиданий. Команда уже разбирается с проблемой «${analysis.problems[0] ?? "требуется дополнительная проверка"}» и вскоре вернётся к вам с понятным решением.`,
    }));

    const inputLength =
      feedback.text.length +
      analysis.summary.length +
      analysis.problems.join(" ").length;

    const outputLength = replies.reduce(
      (total, reply) => total + reply.text.length,
      0,
    );

    return {
      replies,
      metadata: {
        provider: "mock",
        model: "resolve-mock-v1",
        promptVersion: "mock-replies-v1",
        inputTokens: Math.max(
          8,
          Math.ceil(inputLength / 4),
        ),
        outputTokens: Math.max(
          8,
          Math.ceil(outputLength / 4),
        ),
      },
    };
  }
}
