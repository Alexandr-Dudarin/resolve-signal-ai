import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

describe("API error contract", () => {
  it("preserves typed 429 details and makes exactly one HTTP request", async () => {
    const limit = { code: "AI_USAGE_LIMIT_EXCEEDED", scope: "ip_day", retryAfterSeconds: 14820 };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(limit), { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    await expect(api.analyze("test-id")).rejects.toMatchObject({ status: 429, aiUsageLimit: limit });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not invent quota details for a malformed 429 or non-JSON error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ scope: "unknown" }), { status: 429 }))
      .mockResolvedValueOnce(new Response("upstream unavailable", { status: 502 })));
    await expect(api.analyze("test-id")).rejects.toMatchObject({ status: 429, aiUsageLimit: undefined });
    await expect(api.analyze("test-id")).rejects.toBeInstanceOf(ApiError);
  });
});
