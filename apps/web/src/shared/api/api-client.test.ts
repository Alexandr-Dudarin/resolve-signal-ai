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

it("sends cookies through same-origin proxy and parses demo limits", async () => {
  const demoLimit = { code: "DEMO_RATE_LIMIT_EXCEEDED", scope: "create_global", retryAfterSeconds: 60 };
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(demoLimit), { status: 429 }));
  vi.stubGlobal("fetch", fetch);
  await expect(api.createFeedback({ source: "manual", text: "test text", externalId: undefined, authorName: undefined, customerRef: undefined })).rejects.toMatchObject({ demoLimit });
  expect(fetch).toHaveBeenCalledWith("/api/v1/feedback", expect.objectContaining({ credentials: "include", cache: "no-store" }));
});
it("announces protected 401 but does not invalidate a session on a wrong login code", async () => {
  const listener = vi.fn();
  window.addEventListener("resolve-signal:session-expired", listener);
  try {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response("{}", { status: 401 }))));
    await expect(api.loginDemo("wrong")).rejects.toBeInstanceOf(ApiError);
    expect(listener).not.toHaveBeenCalled();
    await expect(api.feedback("id")).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener("resolve-signal:session-expired", listener); }
});
