// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import app from "../src/app.js";

const realFetch = globalThis.fetch;
const pageHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../public/index.html"), "utf8");
let server;
let base;

// Lets a test replace what the API answers, to cover failure paths.
let override = null;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  // The UI uses relative URLs; send them to the real app.
  globalThis.fetch = (path, options) => override?.(path, options) ?? realFetch(base + path, options);
  // jsdom doesn't implement <dialog> yet.
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
afterAll(() => {
  globalThis.fetch = realFetch;
  server.close();
});

const $ = (selector) => document.querySelector(selector);
const settle = () => vi.waitFor(() => expect($("#page-info").textContent).not.toBe(""));
const cards = () => [...document.querySelectorAll(".card")];
const clickButton = (card, label) => [...card.querySelectorAll("button")].find((b) => b.textContent === label).click();
const nameOf = (card) => card.querySelector("h3").textContent;

async function openUi() {
  document.documentElement.innerHTML = pageHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  vi.resetModules();
  await import("../public/app.js");
  await settle();
}

beforeEach(() => {
  override = null;
  vi.restoreAllMocks();
});

describe("user list", () => {
  it("renders the first page with total and pagination state", async () => {
    await openUi();
    expect(cards()).toHaveLength(12);
    expect($("#total").textContent).toBe("(100)");
    expect($("#page-info").textContent).toBe("Page 1 of 9");
    expect($("#prev").disabled).toBe(true);
    expect($("#next").disabled).toBe(false);
    expect(nameOf(cards()[0])).toBe("Admin User");
    expect(cards()[0].querySelector(".avatar").textContent).toBe("AU");
  });

  it("pages forward and back", async () => {
    await openUi();
    const firstPageNames = cards().map(nameOf);
    $("#next").click();
    await vi.waitFor(() => expect($("#page-info").textContent).toBe("Page 2 of 9"));
    expect(cards().map(nameOf)).not.toEqual(firstPageNames);
    expect($("#prev").disabled).toBe(false);
    $("#prev").click();
    await vi.waitFor(() => expect($("#page-info").textContent).toBe("Page 1 of 9"));
    expect(cards().map(nameOf)).toEqual(firstPageNames);
  });

  it("shows the real base URL and a curl example", async () => {
    await openUi();
    expect($("#base-url").textContent).toBe(`${location.origin}/api/v1/users`);
    expect($("#snippet").textContent).toContain("curl");
  });

  it("shows an error notice when the API is unreachable", async () => {
    override = () => Promise.reject(new TypeError("Failed to fetch"));
    document.documentElement.innerHTML = pageHtml.replace(/<script[\s\S]*?<\/script>/g, "");
    vi.resetModules();
    await import("../public/app.js");
    await vi.waitFor(() => expect($("#notice").hidden).toBe(false));
    expect($("#notice").textContent).toContain("Failed to fetch");
  });

  it("explains a rate limit with the wait time", async () => {
    override = () => new Response(JSON.stringify({ status: "FAILED" }), { status: 429, headers: { "Retry-After": "540" } });
    document.documentElement.innerHTML = pageHtml.replace(/<script[\s\S]*?<\/script>/g, "");
    vi.resetModules();
    await import("../public/app.js");
    await vi.waitFor(() => expect($("#notice").hidden).toBe(false));
    expect($("#notice").textContent).toBe("Rate limit reached. Try again in 9 min.");
  });
});

describe("view, create, edit, delete", () => {
  it("shows a user's JSON in the detail dialog", async () => {
    await openUi();
    clickButton(cards()[0], "View");
    await vi.waitFor(() => expect($("#detail-dialog").hasAttribute("open")).toBe(true));
    expect($("#detail-title").textContent).toBe("Admin User");
    expect(JSON.parse($("#detail-json").textContent).email).toBe("admin@example.com");
    expect($("#detail-json").textContent).not.toContain("password");
  });

  it("creates a user and jumps to the last page", async () => {
    await openUi();
    $("#new-user").click();
    expect($("#form-dialog").hasAttribute("open")).toBe(true);
    expect($("#form-title").textContent).toBe("New user");
    const values = { firstName: "Zara", lastName: "UiTest", email: `zara${Date.now()}@example.com`, username: "zarauitest", phone: "+1234567", age: "28", gender: "female", country: "Norway", city: "Oslo" };
    for (const [name, value] of Object.entries(values)) $("#user-form").elements[name].value = value;
    $("#user-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect($("#total").textContent).toBe("(101)"));
    expect($("#form-dialog").hasAttribute("open")).toBe(false);
    expect($("#page-info").textContent).toBe("Page 9 of 9");
    expect(cards().map(nameOf)).toContain("Zara UiTest");
    const created = await realFetch(`${base}/api/v1/users?limit=100&page=2`).then((r) => r.json());
    expect(created.data.some((u) => u.username === "zarauitest" && u.age === 28)).toBe(true);
  });

  it("shows the server's validation errors inside the form", async () => {
    await openUi();
    $("#new-user").click();
    for (const [name, value] of Object.entries({ firstName: "Bad", lastName: "Email", email: "not-an-email", username: "badmail", phone: "+1234567", age: "30", country: "Norway", city: "Oslo" })) {
      $("#user-form").elements[name].value = value;
    }
    $("#user-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect($("#form-error").hidden).toBe(false));
    expect($("#form-error").textContent).toContain("email");
    expect($("#form-dialog").hasAttribute("open")).toBe(true); // stays open so nothing is lost
  });

  it("edits a user, pre-filling the form", async () => {
    await openUi();
    const target = cards()[5];
    const name = nameOf(target);
    clickButton(target, "Edit");
    await vi.waitFor(() => expect($("#form-dialog").hasAttribute("open")).toBe(true));
    expect($("#form-title").textContent).toBe("Edit user");
    expect(`${$("#user-form").elements.firstName.value} ${$("#user-form").elements.lastName.value}`).toBe(name);
    expect($("#user-form").elements.gender.value).toBe("male");
    $("#user-form").elements.city.value = "Edited City";
    $("#user-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect($("#form-dialog").hasAttribute("open")).toBe(false));
    const list = await realFetch(`${base}/api/v1/users?limit=12`).then((r) => r.json());
    expect(list.data[5].city).toBe("Edited City");
  });

  it("explains that demo accounts are read-only when editing one", async () => {
    await openUi();
    clickButton(cards()[0], "Edit");
    await vi.waitFor(() => expect($("#form-dialog").hasAttribute("open")).toBe(true));
    $("#user-form").dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => expect($("#form-error").hidden).toBe(false));
    expect($("#form-error").textContent).toContain("read-only");
  });

  it("deletes a user after confirmation, and not when declined", async () => {
    await openUi();
    const victim = cards()[7];
    const name = nameOf(victim);
    const total = Number($("#total").textContent.slice(1, -1));

    vi.stubGlobal("confirm", () => false);
    clickButton(victim, "Delete");
    await new Promise((r) => setTimeout(r, 50));
    expect($("#total").textContent).toBe(`(${total})`);

    vi.stubGlobal("confirm", () => true);
    clickButton(victim, "Delete");
    await vi.waitFor(() => expect($("#total").textContent).toBe(`(${total - 1})`));
    expect(cards().map(nameOf)).not.toContain(name);
  });
});

describe("safety", () => {
  it("renders user data as text, never as HTML", async () => {
    const payload = '<img src=x onerror="window.__xss=1">';
    const res = await realFetch(`${base}/api/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: payload, lastName: "Xss", email: `xss${Date.now()}@example.com`, username: "xssuser", phone: "+1234567", age: 30, gender: "male", country: "Norway", city: "Oslo" }),
    });
    expect(res.status).toBe(201);

    await openUi();
    $("#next").click(); // jump to the last page where the new user is
    for (let i = 0; i < 8; i++) {
      await vi.waitFor(() => expect($("#page-info").textContent).toBe(`Page ${i + 2} of 9`));
      if (i < 7) $("#next").click();
    }
    const card = cards().find((c) => nameOf(c).includes("Xss"));
    expect(card).toBeTruthy();
    expect(nameOf(card)).toContain("<img src=x");
    expect(document.querySelectorAll("img")).toHaveLength(0);
    expect(window.__xss).toBeUndefined();
  });
});
