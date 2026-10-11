// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const specText = readFileSync(join(root, "public/openapi.json"), "utf8");
const spec = JSON.parse(specText);
const operationCount = Object.values(spec.paths).reduce((n, item) => n + Object.keys(item).length, 0);

async function openDocs(fetchImpl) {
  document.body.innerHTML = '<div id="docs"></div>';
  vi.stubGlobal("fetch", fetchImpl);
  vi.resetModules();
  await import("../public/docs.js");
}

const ops = () => [...document.querySelectorAll(".op")];
const opFor = (method, path) =>
  ops().find((op) => op.querySelector(".method").textContent === method && op.querySelector(".path").textContent === path);

beforeEach(() => vi.unstubAllGlobals());

describe("API reference on the page", () => {
  beforeEach(async () => {
    await openDocs(async () => new Response(specText, { status: 200 }));
  });

  it("renders every operation under its tag", () => {
    expect(ops()).toHaveLength(operationCount);
    expect([...document.querySelectorAll(".docs-group")].map((h) => h.textContent)).toEqual(["Users", "Auth", "Roles"]);
  });

  it("shows method, path, summary and who can call it", () => {
    const op = opFor("PUT", "/api/v1/users/{userId}/roles");
    expect(op.querySelector(".summary-text").textContent).toBe("Set a user's roles");
    expect(op.querySelector(".badge").textContent).toBe("admin only");
    expect(opFor("POST", "/api/v1/auth/login").querySelector(".badge").textContent).toBe("public");
  });

  it("lists request fields with types, rules and which are required", () => {
    const rows = [...opFor("POST", "/api/v1/users").querySelectorAll("table tbody tr")].map((tr) => tr.textContent);
    expect(rows).toHaveLength(9);
    const email = rows.find((r) => r.startsWith("email"));
    expect(email).toContain("required");
    expect(email).toContain("string (email)");
    expect(rows.find((r) => r.startsWith("gender"))).toContain("one of: male, female, other");
    expect(rows.find((r) => r.startsWith("age"))).toContain("1 to 120");
  });

  it("marks optional fields as not required", () => {
    const rows = [...opFor("PATCH", "/api/v1/users/{userId}").querySelectorAll("table tbody tr")];
    const fieldRows = rows.filter((tr) => !tr.textContent.startsWith("userId"));
    expect(fieldRows.length).toBeGreaterThan(5);
    expect(fieldRows.every((tr) => !tr.textContent.includes("required"))).toBe(true);
  });

  it("lists parameters with where they go and whether they are required", () => {
    const rows = (op) => [...op.querySelectorAll("table tbody tr")].map((tr) => tr.textContent);
    const path = rows(opFor("GET", "/api/v1/users/{userId}"));
    expect(path).toHaveLength(1);
    expect(path[0]).toContain("userId");
    expect(path[0]).toContain("path");
    expect(path[0]).toContain("required");

    const list = rows(opFor("GET", "/api/v1/users"));
    expect(list.map((r) => r.match(/^(page|limit|userId)/)[1])).toEqual(["page", "limit", "userId"]);
    expect(list.every((r) => !r.includes("required"))).toBe(true);
    expect(list[1]).toContain("1 to 100");
    expect(list[1]).toContain("default 10");
  });

  it("shows a ready-to-run curl command", () => {
    const pre = [...opFor("POST", "/api/v1/auth/login").querySelectorAll("pre")].find((p) => p.textContent.startsWith("curl"));
    expect(pre.textContent).toContain(`-X POST "${location.origin}/api/v1/auth/login"`);
    expect(pre.textContent).toContain('Content-Type: application/json');
    expect(pre.textContent).toContain('"email":"admin@example.com"');
    expect(pre.textContent).not.toContain("Authorization");

    const secured = [...opFor("GET", "/api/v1/auth/me").querySelectorAll("pre")].find((p) => p.textContent.startsWith("curl"));
    expect(secured.textContent).toContain("Authorization: Bearer <accessToken>");
  });

  it("fills path and required query parameters in the curl example", () => {
    const get = [...opFor("GET", "/api/v1/users/{userId}").querySelectorAll("pre")][0].textContent;
    expect(get).toContain("/api/v1/users/3f2b8c1e-5d4a-4c7b-9e21-8a6f0d9b7c43");
    const patch = [...opFor("PATCH", "/api/v1/users").querySelectorAll("pre")].find((p) => p.textContent.startsWith("curl")).textContent;
    expect(patch).toContain("/api/v1/users?userId=3f2b8c1e");
  });

  it("shows every documented response with its status and example JSON", () => {
    const op = opFor("POST", "/api/v1/auth/login");
    const statuses = [...op.querySelectorAll(".resp-status")].map((s) => s.firstChild.textContent);
    expect(statuses).toEqual(["200", "400", "401"]);
    const jsonBlocks = [...op.querySelectorAll("pre")].filter((p) => p.textContent.startsWith("{"));
    expect(jsonBlocks.map((p) => JSON.parse(p.textContent).status)).toContain("FAILED");
    expect(JSON.parse(jsonBlocks.find((p) => p.textContent.includes("accessToken")).textContent).data.tokenType).toBe("Bearer");
  });

  it("renders spec text as text, never as HTML", async () => {
    const hostile = structuredClone(spec);
    hostile.paths["/api/v1/auth/logout"].post.summary = '<img src=x onerror="window.__docsxss=1">';
    await openDocs(async () => new Response(JSON.stringify(hostile)));
    expect(document.querySelectorAll("img")).toHaveLength(0);
    expect(window.__docsxss).toBeUndefined();
    expect(opFor("POST", "/api/v1/auth/logout").querySelector(".summary-text").textContent).toContain("<img");
  });
});

describe("when the spec can't be loaded", () => {
  it.each([
    ["a network error", async () => { throw new TypeError("Failed to fetch"); }],
    ["an HTTP error", async () => new Response("nope", { status: 500 })],
  ])("explains it after %s", async (_name, impl) => {
    await openDocs(impl);
    expect(ops()).toHaveLength(0);
    expect(document.querySelector("#docs .notice").textContent).toContain("/openapi.json");
  });
});
