import "reflect-metadata";
import dotenv from "dotenv";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app/app.module.js";
import { getApiEnv } from "./app/env.js";

dotenv.config({ path: new URL("../../../.env", import.meta.url) });

async function bootstrap() {
  const env = getApiEnv();
  const app = await NestFactory.create(AppModule, { cors: false });
  app.enableCors({ origin: env.CORS_ORIGIN });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("ResolveSignal AI API")
    .setDescription("Versioned feedback operations API with a configurable AI provider.")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(env.PORT, "0.0.0.0");
  console.log(`ResolveSignal API listening on http://localhost:${env.PORT}`);
  console.log(`Swagger available at http://localhost:${env.PORT}/api/docs`);
}

void bootstrap();
