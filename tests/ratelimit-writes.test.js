import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { api } from "./helpers.js";

beforeAll(() => vi.stubEnv("DISABLE_RATE_LIMIT", ""));
afterAll(() => vi.unstubAllEnvs());

const logout = (ip) => api().post("/api/v1/auth/logout").set("X-Forwarded-For", ip);

describe("write rate limit (60 per 15 minutes per IP)", () => {
  it("blocks the 61st write with a JSON 429 and Retry-After, but still serves reads", async () => {
    for (let i = 0; i < 60; i++) {
      expect((await logout("10.0.0.1")).status).toBe(200);
    }
    const blocked = await logout("10.0.0.1");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ status: "FAILED", data: { error: "Too many requests, try again later." } });
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);

    const read = await api().get("/api/v1/users?limit=1").set("X-Forwarded-For", "10.0.0.1");
    expect(read.status).toBe(200);
  });

  it("limits each client IP separately", async () => {
    expect((await logout("10.0.0.2")).status).toBe(200);
  });

  it("adds CORS headers to 429 responses so browser apps can read them", async () => {
    const blocked = await logout("10.0.0.1").set("Origin", "https://example.org");
    expect(blocked.status).toBe(429);
    expect(blocked.headers["access-control-allow-origin"]).toBe("*");
  });
});
