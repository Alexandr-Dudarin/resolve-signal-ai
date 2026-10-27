import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createVercelConfig } from "./vercel-config.js";

describe("actual monorepo deployment configuration", () => {
  it("uses the supplied Render origin, proxies API before the SPA fallback and keeps API private", () => {
    const config = createVercelConfig({ RENDER_API_ORIGIN: "https://unit-test.onrender.com" });
    expect(config.rewrites).toEqual([
      { source: "/api/:path*", destination: "https://unit-test.onrender.com/api/:path*" },
      { source: "/:path*", destination: "/index.html" },
    ]);
    expect(config.outputDirectory).toBe("apps/web/dist");
    expect(config.installCommand).toContain("--prod=false");
    expect(config.buildCommand.indexOf("contracts:build")).toBeLessThan(config.buildCommand.indexOf("@resolve-signal/web"));
    expect(config.headers[0]).toMatchObject({ source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] });
    expect(JSON.stringify(config)).not.toMatch(/OPENAI_API_KEY|DEMO_ACCESS_CODE|DEMO_SESSION_SECRET/);
  });
  it.each([undefined, "http://unit-test.onrender.com", "https://unit-test.onrender.com/", "https://unit-test.onrender.com/api", "https://user:secret@unit-test.onrender.com", "https://unit-test.onrender.com.evil.example"])("fails closed with invalid backend origin %s", (RENDER_API_ORIGIN) => {
    expect(() => createVercelConfig({ RENDER_API_ORIGIN })).toThrow();
  });
  it("refuses cross-origin client requests", () => {
    expect(() => createVercelConfig({ RENDER_API_ORIGIN: "https://unit-test.onrender.com", VITE_API_URL: "https://unit-test.onrender.com" })).toThrow();
  });
  it("Render has no implicit migrations/seed or live provider fallback", () => {
    const config = readFileSync(new URL("../render.yaml", import.meta.url), "utf8");
    expect(config).not.toMatch(/db:seed|db:demo:init|migrate deploy|preDeployCommand/);
    expect(config).toContain("node apps/api/dist/main.js");
    expect(config).toContain("autoDeployTrigger: off");
    expect(config).toContain("value: openai");
  });
});
