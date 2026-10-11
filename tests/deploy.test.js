import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import handler from "../api/index.js";
import { api } from "./helpers.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const html = read("public/index.html");
const vercel = JSON.parse(read("vercel.json"));
const pkg = JSON.parse(read("package.json"));

describe("Vercel configuration", () => {
  it("runs the tests as the build step, so a failing test blocks the deploy", () => {
    expect(vercel.buildCommand).toBe("npm test");
    expect(pkg.scripts.test).toBeTruthy();
  });

  it("serves public/ and rewrites /api/* to the serverless function", () => {
    expect(vercel.outputDirectory).toBe("public");
    expect(vercel.rewrites).toContainEqual({ source: "/api/(.*)", destination: "/api/index.js" });
    expect(existsSync(new URL("../api/index.js", import.meta.url))).toBe(true);
  });

  it("exports the Express app from api/index.js", async () => {
    expect(handler).toBe(app);
    const res = await request(handler).get("/api/v1/users?limit=1");
    expect(res.status).toBe(200);
  });

  it("uses ES modules and lists every runtime dependency", () => {
    expect(pkg.type).toBe("module");
    for (const dep of ["express", "cors", "helmet", "compression", "express-rate-limit", "joi", "jsonwebtoken", "uuid"]) {
      expect(pkg.dependencies, dep).toHaveProperty(dep);
    }
    expect(pkg.dependencies).not.toHaveProperty("vitest");
  });
});

describe("static site", () => {
  it.each(["index.html", "404.html", "styles.css", "app.js", "docs.js", "dom.js", "openapi.json", "favicon.svg", "og-image.png", "robots.txt", "sitemap.xml"])(
    "public/%s exists",
    (file) => {
      expect(existsSync(new URL(`../public/${file}`, import.meta.url))).toBe(true);
    }
  );

  it.each(["/", "/styles.css", "/app.js", "/docs.js", "/dom.js", "/openapi.json", "/favicon.svg", "/og-image.png", "/robots.txt", "/sitemap.xml", "/404.html"])(
    "serves %s",
    async (path) => {
      expect((await api().get(path)).status).toBe(200);
    }
  );

  it("only references local files that exist", () => {
    const refs = [...html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)].map((m) => m[1]).filter((p) => !p.startsWith("/api"));
    expect(refs.length).toBeGreaterThan(2);
    for (const ref of refs) {
      const file = ref === "/" ? "index.html" : ref.slice(1);
      expect(existsSync(new URL(`../public/${file}`, import.meta.url)), ref).toBe(true);
    }
  });

  it("is compatible with the Content-Security-Policy", async () => {
    const csp = (await api().get("/")).headers["content-security-policy"];
    expect(csp).toContain("script-src 'self'");
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
    for (const attrs of scripts) {
      expect(attrs.includes("src=") || attrs.includes("application/ld+json"), `inline script: ${attrs}`).toBe(true);
    }
    expect(html).not.toMatch(/\son[a-z]+=/i);
    // No third-party scripts, styles or images; the only outside links are to the GitHub repo.
    expect(html).not.toMatch(/\ssrc="https?:/);
    const external = [...html.matchAll(/\shref="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
    for (const url of external) {
      expect(url, url).toMatch(/^https:\/\/(fake-user-api-crud\.vercel\.app\/|github\.com\/Majid-Ali-Watto\/fake-user-api)/);
    }
  });
});

describe("project links", () => {
  const repo = "https://github.com/Majid-Ali-Watto/fake-user-api";

  it("links to the GitHub project from the page and the package metadata", () => {
    expect(html).toContain(`href="${repo}"`);
    expect(html).toContain(`href="${repo}/issues"`);
    expect(pkg.repository.url).toContain("github.com/Majid-Ali-Watto/fake-user-api");
    expect(pkg.homepage).toBe("https://fake-user-api-crud.vercel.app");
  });

  it("shows the GitHub link prominently at the top and again in the footer", () => {
    const hero = html.match(/<p class="links">([\s\S]*?)<\/p>/)[1];
    expect(hero).toContain(`href="${repo}"`);
    expect(hero).toContain("/openapi.json");
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)[0];
    expect(footer).toContain(`href="${repo}"`);
    expect(footer).toContain(`href="${repo}/issues"`);
  });

  it("exposes the repository and the OpenAPI spec through the API index", async () => {
    const body = (await api().get("/api")).body;
    expect(body.repository).toBe(repo);
    expect(body.openapi).toBe("/openapi.json");
    expect((await api().get(body.openapi)).status).toBe(200);
  });

  it("sends CORS headers for the spec on Vercel's CDN", () => {
    const rule = vercel.headers.find((h) => h.source === "/openapi.json");
    expect(rule.headers).toContainEqual({ key: "Access-Control-Allow-Origin", value: "*" });
  });

  it("has an API reference section and a no-JavaScript fallback", () => {
    expect(html).toContain('id="reference"');
    expect(html).toContain('<script src="/docs.js" type="module"></script>');
    expect(html).toMatch(/<div id="docs"><noscript>/);
  });
});

describe("SEO", () => {
  it("has the essential metadata", () => {
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    expect(title.length).toBeGreaterThan(20);
    expect(title.length).toBeLessThanOrEqual(80);
    const description = html.match(/name="description" content="([^"]*)"/)[1];
    expect(description.length).toBeGreaterThan(70);
    expect(description.length).toBeLessThanOrEqual(170);
    expect(html).toContain('<link rel="canonical" href="https://fake-user-api-crud.vercel.app/">');
    expect(html).toContain('property="og:image" content="https://fake-user-api-crud.vercel.app/og-image.png"');
    expect(html).toContain('name="twitter:card"');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it("has valid JSON-LD", () => {
    const json = html.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    const data = JSON.parse(json);
    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"].map((n) => n["@type"])).toEqual(["WebSite", "WebAPI"]);
  });

  it("keeps crawlers out of the API and points them at the sitemap", () => {
    const robots = read("public/robots.txt");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Sitemap: https://fake-user-api-crud.vercel.app/sitemap.xml");
    expect(read("public/sitemap.xml")).toContain("<loc>https://fake-user-api-crud.vercel.app/</loc>");
  });

  it("is documented: every public endpoint appears on the page", async () => {
    const { endpoints } = (await api().get("/api")).body;
    for (const { path } of endpoints) {
      const shown = path.replace(/^\/api\/v1/, "/api/v1");
      expect(html, shown).toContain(shown);
    }
  });
});
