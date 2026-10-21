import type { IncomingMessage, ServerResponse } from "node:http";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { ApiEnv } from "./env.js";
import { DemoErrorFilter } from "./demo-error.filter.js";

// Shared by the real bootstrap and HTTP tests; disable Nest's default body parser.
export function configureHttp(app: NestExpressApplication, env: ApiEnv) {
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
  app.disable("x-powered-by");
  app.use((_request: IncomingMessage, response: ServerResponse, next: () => void) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.useBodyParser("json", { limit: "32kb" });
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true });
  app.useGlobalFilters(new DemoErrorFilter());
  if (!env.DEMO_ACCESS_ENABLED && env.NODE_ENV !== "production") {
    const document = new DocumentBuilder().setTitle("ResolveSignal AI API").setVersion("1.0").build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, document));
  }
}
