import "reflect-metadata";
import dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app/app.module.js";
import { getApiEnv } from "./app/env.js";
import { configureHttp } from "./app/configure-http.js";

dotenv.config({ path: new URL("../../../.env", import.meta.url), quiet: true });

async function bootstrap() {
  const env = getApiEnv();
  // Bootstrap errors can contain DB URLs / upstream details: report no raw exceptions.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false, bodyParser: false, abortOnError: false, logger: false,
  });
  configureHttp(app, env);
  app.enableShutdownHooks();
  await app.listen(env.PORT, "0.0.0.0");
  console.log(`ResolveSignal API listening on port ${env.PORT}`);
}

bootstrap().catch(() => {
  console.error("API startup failed. Check server environment and database connectivity.");
  process.exitCode = 1;
});
