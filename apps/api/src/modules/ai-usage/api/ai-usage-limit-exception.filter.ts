import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
} from "@nestjs/common";

import { AiUsageLimitExceededError } from "../application/ai-usage-limiter.js";

type HttpResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): HttpResponse;
  json(body: unknown): void;
};

@Catch(AiUsageLimitExceededError)
export class AiUsageLimitExceptionFilter implements ExceptionFilter {
  catch(exception: AiUsageLimitExceededError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<HttpResponse>();

    response.setHeader(
      "Retry-After",
      String(exception.retryAfterSeconds),
    );
    response.status(429).json(exception.toResponse());
  }
}
