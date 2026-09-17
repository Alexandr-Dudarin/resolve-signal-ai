import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

const ApiEnvSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CORS_ORIGIN: z.string().url().default("http://localhost:5173"),

    AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),

    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).optional(),

    AI_USAGE_LIMITS_ENABLED: booleanFromEnv.default(true),
    AI_LIMIT_PER_IP_MINUTE: z.coerce.number().int().min(1).default(5),
    AI_LIMIT_PER_IP_DAY: z.coerce.number().int().min(1).default(20),
    AI_LIMIT_GLOBAL_DAY: z.coerce.number().int().min(1).default(100),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER !== "openai") {
      return;
    }

    if (!env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required when AI_PROVIDER=openai",
      });
    }

    if (!env.OPENAI_MODEL) {
      ctx.addIssue({
        code: "custom",
        path: ["OPENAI_MODEL"],
        message: "OPENAI_MODEL is required when AI_PROVIDER=openai",
      });
    }
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
