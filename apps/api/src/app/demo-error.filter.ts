import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { DemoRateLimitErrorSchema } from "@resolve-signal/contracts";

@Catch()
export class DemoErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<ServerResponse>();
    const status = exception instanceof HttpException ? exception.getStatus()
      : typeof exception === "object" && exception !== null && "status" in exception && exception.status === 413 ? 413 : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const limit = DemoRateLimitErrorSchema.safeParse(body);
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    if (limit.success) {
      response.setHeader("Retry-After", String(limit.data.retryAfterSeconds));
      response.end(JSON.stringify(limit.data));
      return;
    }
    // Never serialize exception messages/stacks from Prisma, provider SDKs or middleware.
    const messages: Record<number, string> = {
      400: "Проверьте данные запроса.", 401: "Неверный код доступа или срок сессии истёк.",
      403: "Недопустимый источник запроса.", 404: "Запрошенные данные не найдены.",
      413: "Запрос слишком большой.", 415: "Ожидается JSON-запрос.",
    };
    response.end(JSON.stringify({ statusCode: status, message: messages[status] ?? "Не удалось выполнить запрос. Попробуйте позже." }));
  }
}
