import { z } from "zod";

const ApiEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  AI_PROVIDER: z.literal("mock").default("mock"),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function getApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = ApiEnvSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid API environment: ${details}`);
  }
  return result.data;
}
