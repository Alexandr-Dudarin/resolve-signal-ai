import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}, z.boolean());

const ApiEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    CORS_ORIGIN: z.string().url().default("http://localhost:5173"),

    AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
    DEMO_ACCESS_ENABLED: booleanFromEnv.default(false),
    DEMO_ACCESS_CODE: z.string().optional(),
    DEMO_SESSION_SECRET: z.string().optional(),
    DEMO_SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(43200),
    DEMO_LOGIN_PER_IP: z.coerce.number().int().min(1).max(100).default(5),
    DEMO_LOGIN_GLOBAL: z.coerce.number().int().min(1).max(1000).default(30),
    DEMO_WRITE_PER_IP_MINUTE: z.coerce.number().int().min(1).max(1000).default(30),
    DEMO_WRITE_GLOBAL_MINUTE: z.coerce.number().int().min(1).max(5000).default(60),
    DEMO_CREATE_GLOBAL_DAY: z.coerce.number().int().min(1).max(10000).default(100),

    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).optional(),

    AI_USAGE_LIMITS_ENABLED: booleanFromEnv.default(true),
    AI_LIMIT_PER_IP_MINUTE: z.coerce.number().int().min(1).default(5),
    AI_LIMIT_PER_IP_DAY: z.coerce.number().int().min(1).default(20),
    AI_LIMIT_GLOBAL_DAY: z.coerce.number().int().min(1).default(100),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((env, ctx) => {
    const issue = (name: string, message: string) => ctx.addIssue({ code: "custom", path: [name], message });
    let origin: URL;
    try { origin = new URL(env.CORS_ORIGIN); }
    catch { issue("CORS_ORIGIN", "Must be a valid origin"); return; }
    if (origin.origin !== env.CORS_ORIGIN || !["http:", "https:"].includes(origin.protocol)) {
      issue("CORS_ORIGIN", "Must be a single exact HTTP(S) origin, without a trailing slash");
    }
    if (env.DEMO_ACCESS_ENABLED) {
      for (const [name, minimum] of [["DEMO_ACCESS_CODE", 22], ["DEMO_SESSION_SECRET", 43]] as const) {
        const secret = env[name] ?? "";
        if (!/^[A-Za-z0-9_-]+$/.test(secret) || secret.length < minimum || secret.length > 128 || new Set(secret).size < 12) {
          issue(name, "Must be independently generated random base64url text of the documented length");
        }
      }
      if (env.DEMO_ACCESS_CODE === env.DEMO_SESSION_SECRET) issue("DEMO_SESSION_SECRET", "Must differ from the access code");
    }
    if (env.NODE_ENV === "production") {
      if (!env.DEMO_ACCESS_ENABLED) issue("DEMO_ACCESS_ENABLED", "Must be true in production");
      if (env.AI_PROVIDER !== "openai") issue("AI_PROVIDER", "Must be openai in production");
      if (!env.AI_USAGE_LIMITS_ENABLED) issue("AI_USAGE_LIMITS_ENABLED", "Must be true in production");
      if (origin.protocol !== "https:") issue("CORS_ORIGIN", "Must use HTTPS in production");
      try {
        const db = new URL(env.DATABASE_URL);
        const keys = [...db.searchParams.keys()];
        if (!["postgres:", "postgresql:"].includes(db.protocol) || db.searchParams.get("sslmode") !== "require" || db.searchParams.get("sslaccept") !== "strict" || new Set(keys).size !== keys.length || db.searchParams.has("host") || db.searchParams.has("options")) {
          issue("DATABASE_URL", "Must use PostgreSQL with sslmode=require and sslaccept=strict");
        }
      } catch { issue("DATABASE_URL", "Must be a valid PostgreSQL URL"); }
    }
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
  const result = ApiEnvSchema.safeParse({
    ...source,
    AI_PROVIDER: source.AI_PROVIDER ?? (source.NODE_ENV === "production" ? "openai" : "mock"),
    DEMO_ACCESS_ENABLED: source.DEMO_ACCESS_ENABLED ?? (source.NODE_ENV === "production" ? "true" : "false"),
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid API environment: ${details}`);
  }

  return result.data;
}
