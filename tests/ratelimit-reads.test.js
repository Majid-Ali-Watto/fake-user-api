import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { api } from "./helpers.js";

beforeAll(() => vi.stubEnv("DISABLE_RATE_LIMIT", ""));
afterAll(() => vi.unstubAllEnvs());

describe("overall rate limit (300 per 15 minutes per IP)", () => {
  it("blocks the 301st request and reports the limit in headers", async () => {
    const first = await api().get("/api").set("X-Forwarded-For", "10.1.0.1");
    expect(first.headers["ratelimit-limit"]).toBeDefined();
    for (let i = 1; i < 300; i++) {
      await api().get("/api").set("X-Forwarded-For", "10.1.0.1");
    }
    expect((await api().get("/api").set("X-Forwarded-For", "10.1.0.1")).status).toBe(429);
    expect((await api().get("/api").set("X-Forwarded-For", "10.1.0.2")).status).toBe(200);
  }, 30_000);

  it("does not limit the static UI", async () => {
    expect((await api().get("/").set("X-Forwarded-For", "10.1.0.1")).status).toBe(200);
  });
});
