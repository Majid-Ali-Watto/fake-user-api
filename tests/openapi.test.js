import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";
import { beforeAll, describe, expect, it } from "vitest";
import { api, bearer, loginAs, uniqueSuffix } from "./helpers.js";

const specPath = join(dirname(fileURLToPath(import.meta.url)), "../public/openapi.json");
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
  Object.entries(item).map(([method, op]) => ({ path, method, op }))
);
const label = ({ method, path }) => `${method.toUpperCase()} ${path}`;

describe("OpenAPI spec", () => {
  it("is a valid OpenAPI 3 document with every $ref resolving", async () => {
    const parsed = await SwaggerParser.validate(structuredClone(spec));
    expect(parsed.openapi).toMatch(/^3\./);
  });

  it("documents every endpoint listed by GET /api, and nothing else", async () => {
    const { endpoints } = (await api().get("/api")).body;
    const listed = new Set(endpoints.map((e) => `${e.method} ${e.path}`));
    // The spec also documents the ?userId= variants of PATCH/PUT/DELETE on /users.
    const queryVariants = new Set(["PATCH /api/v1/users", "PUT /api/v1/users", "DELETE /api/v1/users"]);
    const documented = operations
      .map(({ method, path }) => `${method.toUpperCase()} ${path.replace(/\{(\w+)\}/g, ":$1")}`)
      .filter((key) => !queryVariants.has(key));
    expect(new Set(documented)).toEqual(listed);
  });

  it("gives every operation a summary, a tag, an access level and a success response", () => {
    for (const { method, path, op } of operations) {
      const name = label({ method, path });
      expect(op.summary, name).toBeTruthy();
      expect(spec.tags.map((t) => t.name), name).toContain(op.tags[0]);
      expect(["public", "admin only", "any logged-in user"], name).toContain(op["x-access"]);
      expect(Object.keys(op.responses).some((s) => s.startsWith("2")), name).toBe(true);
      expect(Boolean(op.security), name).toBe(op["x-access"] !== "public");
    }
  });

  it("gives every request body and response an example", () => {
    for (const { method, path, op } of operations) {
      const name = label({ method, path });
      if (op.requestBody) expect(op.requestBody.content["application/json"].example, name).toBeDefined();
      for (const [status, response] of Object.entries(op.responses)) {
        expect(response.content["application/json"].example, `${name} ${status}`).toBeDefined();
      }
    }
  });

  it("is served with CORS so browser tools can import it", async () => {
    const res = await api().get("/openapi.json").set("Origin", "https://editor.swagger.io");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });
});

// The docs are only useful if they match the API. Send each documented example request to the
// real API and check the documented success status and the documented response fields.
describe("OpenAPI examples match the real API", () => {
  let seeded; // non-demo users we may modify or delete, one per operation
  let admin;

  beforeAll(async () => {
    seeded = (await api().get("/api/v1/users?limit=100")).body.data.slice(3).map((u) => u.id);
    admin = await loginAs("admin");
  });

  const keysMissingFrom = (example, actual) => {
    if (Array.isArray(example)) return Array.isArray(actual) ? keysMissingFrom(example[0], actual[0] ?? {}) : ["(expected an array)"];
    if (example === null || typeof example !== "object") return [];
    return Object.entries(example).flatMap(([key, value]) =>
      key in actual ? keysMissingFrom(value, actual[key]).map((k) => `${key}.${k}`) : [key]
    );
  };

  const requestBodyFor = ({ path, op }) => {
    const example = structuredClone(op.requestBody?.content["application/json"].example);
    if (!example) return undefined;
    if ("email" in example && path !== "/api/v1/auth/login") {
      const n = uniqueSuffix();
      Object.assign(example, { email: `example${n}@example.com`, ...("username" in example && { username: `example${n}` }) });
    }
    if ("refreshToken" in example) example.refreshToken = admin.refreshToken;
    return example;
  };

  it.each(operations.map((o) => [label(o), o]))("%s", async (_name, operation) => {
    const { method, path, op } = operation;
    const pathParams = { userId: seeded.shift(), name: "admin" };
    const url = path.replace(/\{(\w+)\}/g, (_, name) => pathParams[name]);
    // Operations that take ?userId= instead of a path parameter.
    const query = op.parameters?.some((p) => p.in === "query" && p.name === "userId" && p.required) ? `?userId=${seeded.shift()}` : "";
    let request = api()[method](url + query);
    if (op.security) request = request.set(bearer(admin.accessToken));
    const body = requestBodyFor(operation);
    if (body) request = request.send(body);
    const res = await request;

    const [status, response] = Object.entries(op.responses).find(([s]) => s.startsWith("2"));
    expect(res.status, JSON.stringify(res.body)).toBe(Number(status));
    expect(res.body.status).toBe("OK");
    const documented = response.content["application/json"].example;
    expect(keysMissingFrom(documented, res.body), "documented fields the API doesn't return").toEqual([]);
  });
});
