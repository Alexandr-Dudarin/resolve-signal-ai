import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { requireLocalSeedDatabase, requirePublicDemoDatabase } from "./demo-database-guard.js";
import { initializePublicDemo, publicDemoFeedback } from "./public-demo-data.js";
const base = {
  DIRECT_URL: "postgresql://test:secret@ep-test.region.aws.neon.tech/resolve_demo?sslmode=require&sslaccept=strict",
  PUBLIC_DEMO_DB_HOST: "ep-test.region.aws.neon.tech", PUBLIC_DEMO_DB_NAME: "resolve_demo",
  PUBLIC_DEMO_CONFIRM: "init-public-demo",
};
describe("explicit non-destructive demo data", () => {
  it("uses one insert-only, duplicate-safe command for synthetic records", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 5 });
    await initializePublicDemo({ feedbackItem: { createMany } } as unknown as PrismaClient);
    expect(createMany).toHaveBeenCalledExactlyOnceWith({ data: publicDemoFeedback, skipDuplicates: true });
    expect(new Set(publicDemoFeedback.map((x) => x.id)).size).toBe(5);
    expect(publicDemoFeedback.every((x) => x.text.startsWith("Демо:") && x.authorName === "Демо-клиент")).toBe(true);
  });
  it("requires exact database and action confirmation", () => {
    expect(requirePublicDemoDatabase(base, "init")).toBe(base.DIRECT_URL);
    expect(() => requirePublicDemoDatabase(base, "migrate")).toThrow();
    expect(requirePublicDemoDatabase({ ...base, PUBLIC_DEMO_CONFIRM: "migrate-public-demo" }, "migrate")).toBe(base.DIRECT_URL);
  });
  it.each([
    { PUBLIC_DEMO_CONFIRM: undefined }, { DIRECT_URL: undefined }, { PUBLIC_DEMO_DB_NAME: "normal_database" },
    { PUBLIC_DEMO_DB_HOST: "other.neon.tech" }, { DIRECT_URL: "not a URL" },
    { DIRECT_URL: base.DIRECT_URL.replace("sslmode=require", "sslmode=disable") },
    { DIRECT_URL: base.DIRECT_URL.replace("sslaccept=strict", "sslaccept=accept_invalid_certs") },
    { DIRECT_URL: base.DIRECT_URL + "&schema=other" }, { DIRECT_URL: base.DIRECT_URL + "&host=other" },
    { DIRECT_URL: base.DIRECT_URL + "&sslmode=disable" }, { DIRECT_URL: base.DIRECT_URL + "&options=override" },
    { DIRECT_URL: base.DIRECT_URL.replace("ep-test.", "ep-test-pooler."), PUBLIC_DEMO_DB_HOST: "ep-test-pooler.region.aws.neon.tech" },
  ])("rejects an unsafe init configuration %#", (changes) => {
    expect(() => requirePublicDemoDatabase({ ...base, ...changes }, "init")).toThrow();
  });
  it("allows only explicitly opted-in local validation outside production", () => {
    const local = { ...base, DIRECT_URL: "postgresql://test:test@localhost:5432/resolve_demo", PUBLIC_DEMO_DB_HOST: "localhost" };
    expect(() => requirePublicDemoDatabase(local, "init")).toThrow();
    expect(requirePublicDemoDatabase({ ...local, PUBLIC_DEMO_ALLOW_LOCAL: "true" }, "init")).toBe(local.DIRECT_URL);
    expect(() => requirePublicDemoDatabase({ ...local, PUBLIC_DEMO_ALLOW_LOCAL: "true", NODE_ENV: "production" }, "init")).toThrow();
  });
  it.each([
    { NODE_ENV: "production" }, { DEMO_ACCESS_ENABLED: "true" },
    { DATABASE_URL: base.DIRECT_URL }, { DATABASE_URL: "postgresql://test:test@localhost/demo?host=remote" },
  ])("blocks destructive seed for protected/nonlocal databases %#", (changes) => {
    expect(() => requireLocalSeedDatabase({ DATABASE_URL: "postgresql://test:test@localhost/test", ...changes })).toThrow();
  });
  it("preserves the ordinary local seed workflow", () => {
    expect(() => requireLocalSeedDatabase({ DATABASE_URL: "postgresql://test:test@localhost/test" })).not.toThrow();
  });
});
