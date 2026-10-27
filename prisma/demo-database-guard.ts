export function requirePublicDemoDatabase(env: NodeJS.ProcessEnv, action: "init" | "migrate"): string {
  if (env.PUBLIC_DEMO_CONFIRM !== `${action}-public-demo`) throw new Error("Explicit PUBLIC_DEMO_CONFIRM is required");
  if (!env.DIRECT_URL || !env.PUBLIC_DEMO_DB_HOST || !env.PUBLIC_DEMO_DB_NAME) throw new Error("DIRECT_URL and exact demo database identity are required");
  let url: URL;
  try { url = new URL(env.DIRECT_URL); } catch { throw new Error("DIRECT_URL must be a PostgreSQL URL"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("PostgreSQL is required");
  if (url.hostname !== env.PUBLIC_DEMO_DB_HOST || url.pathname !== `/${env.PUBLIC_DEMO_DB_NAME}` || !/^[a-z0-9_]*demo[a-z0-9_]*$/.test(env.PUBLIC_DEMO_DB_NAME)) {
    throw new Error("Demo database identity does not match the explicit host/name allowlist");
  }
  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length || ["host", "options"].some((key) => url.searchParams.has(key)) || url.hash || (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public")) {
    throw new Error("Unexpected database routing parameters");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (local && env.NODE_ENV !== "production" && env.PUBLIC_DEMO_ALLOW_LOCAL === "true") return env.DIRECT_URL;
  if (!url.hostname.endsWith(".neon.tech") || url.hostname.includes("-pooler.") || (url.port && url.port !== "5432")) throw new Error("Use the dedicated direct Neon endpoint");
  if (url.searchParams.get("sslmode") !== "require" || url.searchParams.get("sslaccept") !== "strict") throw new Error("Prisma 6 requires sslmode=require and sslaccept=strict");
  return env.DIRECT_URL;
}

export function requireLocalSeedDatabase(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === "production" || env.DEMO_ACCESS_MODE === "guest" || ![undefined, "false"].includes(env.DEMO_ACCESS_ENABLED)) throw new Error("Destructive seed is disabled for protected/public environments");
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ""); } catch { throw new Error("A local DATABASE_URL is required for destructive seed"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.searchParams.has("host") || url.searchParams.has("options")) {
    throw new Error("Destructive seed is restricted to a local development database");
  }
}
