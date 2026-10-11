import { describe, expect, it } from "vitest";
import { api, bearer, loginAs, UNKNOWN_ID } from "./helpers.js";

describe("API index", () => {
  it.each(["/api", "/api/", "/api/v1", "/api/v1/"])("GET %s lists the endpoints", async (path) => {
    const res = await api().get(path);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "OK", name: "Fake User API", version: "v1" });
    expect(res.body.endpoints.length).toBeGreaterThan(10);
    for (const endpoint of res.body.endpoints) {
      expect(endpoint).toEqual({
        method: expect.stringMatching(/^(GET|POST|PUT|PATCH|DELETE)$/),
        path: expect.stringMatching(/^\/api\/v1\//),
        access: expect.any(String),
        description: expect.any(String),
      });
    }
  });

  it("documents the demo accounts, and they work", async () => {
    const { demoAccounts } = (await api().get("/api")).body;
    expect(demoAccounts.password).toBe("password123");
    expect(demoAccounts.logins).toHaveLength(3);
    expect((await loginAs("admin")).user.roles).toEqual(["admin"]);
  });

  it("only lists endpoints that exist", async () => {
    const { endpoints } = (await api().get("/api")).body;
    const { accessToken } = await loginAs("admin");
    for (const { method, path } of endpoints) {
      const concrete = path.replace(":userId", UNKNOWN_ID).replace(":name", "admin");
      const res = await api()[method.toLowerCase()](concrete).set(bearer(accessToken)).send({});
      expect(res.status, `${method} ${path}`).not.toBe(405);
      const notFoundRoute = res.status === 404 && /not found$/.test(res.body?.data?.error ?? "") && /^Route /.test(res.body.data.error);
      expect(notFoundRoute, `${method} ${path} is a missing route`).toBe(false);
    }
  });

  it("answers HEAD", async () => {
    expect((await api().head("/api")).status).toBe(200);
  });

  it.each(["post", "put", "patch", "delete"])("rejects %s with 405 and an Allow header", async (method) => {
    const res = await api()[method]("/api");
    expect(res.status).toBe(405);
    expect(res.headers.allow).toBe("GET, HEAD, OPTIONS");
    expect(res.body.status).toBe("FAILED");
  });
});

describe("method not allowed", () => {
  it.each([
    ["post", `/api/v1/users/${UNKNOWN_ID}`, "GET, PATCH, PUT, DELETE"],
    ["get", `/api/v1/users/${UNKNOWN_ID}/roles`, "PUT"],
    ["get", "/api/v1/auth/login", "POST"],
    ["post", "/api/v1/auth/me", "GET"],
  ])("%s %s", async (method, path, allow) => {
    const res = await api()[method](path);
    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain(allow);
    expect(res.body.data.error).toContain(`Method ${method.toUpperCase()} not allowed on ${path}`);
  });
});

describe("not found", () => {
  it.each(["/api/nope", "/api/v2/users", "/api/v1/nope", "/api/v1/users/a/b", "/api/v1/auth", "/api/v1/auth/nope"])(
    "returns a JSON 404 for %s",
    async (path) => {
      const res = await api().get(path);
      expect(res.status).toBe(404);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body).toEqual({ status: "FAILED", data: { error: `Route GET ${path} not found` } });
    }
  );

  it("returns the HTML 404 page to browsers", async () => {
    const res = await api().get("/does-not-exist").set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toContain("404");
    expect(res.text).toContain('name="robots" content="noindex"');
  });

  it("returns JSON to API clients on non-API paths, for any method", async () => {
    for (const method of ["get", "post", "delete"]) {
      const res = await api()[method]("/does-not-exist");
      expect(res.status).toBe(404);
      expect(res.body.status).toBe("FAILED");
    }
  });
});

describe("bad requests", () => {
  it("rejects malformed JSON with 400", async () => {
    const res = await api().post("/api/v1/users").set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("FAILED");
  });

  it("rejects a non-object JSON body", async () => {
    const res = await api().post("/api/v1/users").set("Content-Type", "application/json").send("[]");
    expect(res.status).toBe(400);
  });

  it("treats a non-JSON body as empty", async () => {
    const res = await api().post("/api/v1/users").set("Content-Type", "text/plain").send("hello");
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("rejects an oversized body with 413", async () => {
    const res = await api().post("/api/v1/users").send({ firstName: "x".repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it("rejects a malformed URL escape with 400", async () => {
    expect((await api().get("/api/v1/users/%E0%A4%A")).status).toBe(400);
  });
});

describe("CORS and security headers", () => {
  it("allows any origin to call the API", async () => {
    const res = await api().get("/api/v1/users?limit=1").set("Origin", "https://example.org");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("answers preflights for authenticated requests with the Authorization header allowed", async () => {
    const res = await api()
      .options("/api/v1/auth/login")
      .set("Origin", "https://example.org")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-headers"]).toMatch(/authorization/i);
    expect(res.headers["access-control-allow-methods"]).toMatch(/PATCH/);
  });

  it("sends helmet headers and compresses large responses", async () => {
    const res = await api().get("/api/v1/users?limit=100").set("Accept-Encoding", "gzip");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["content-encoding"]).toBe("gzip");
  });
});
