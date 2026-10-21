import { describe, expect, it } from "vitest";
import { parseWebEnv } from "./parse-web-env";

describe("same-origin browser API configuration", () => {
  it("defaults to the same origin in development and production", () => {
    expect(parseWebEnv({})).toEqual({ VITE_API_URL: "" });
    expect(parseWebEnv({ PROD: true })).toEqual({ VITE_API_URL: "" });
  });
  it("allows an explicit development API origin", () => {
    expect(parseWebEnv({ VITE_API_URL: "http://localhost:4000" }).VITE_API_URL).toBe("http://localhost:4000");
  });
  it.each(["https://api.example", "http://localhost:4000", "/api", "javascript:alert(1)"])("rejects non-proxy production API URL %s", (value) => {
    expect(() => parseWebEnv({ PROD: true, VITE_API_URL: value })).toThrow();
  });
});
