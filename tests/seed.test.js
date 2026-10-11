import { describe, expect, it, vi } from "vitest";

const loadUsers = async () => {
  vi.resetModules();
  const { getAllUsers } = await import("../src/database/User.js");
  return getAllUsers();
};

describe("seed data", () => {
  it("has 100 well-formed users", async () => {
    const users = await loadUsers();
    expect(users).toHaveLength(100);
    for (const u of users) {
      expect(u.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(u.email).toMatch(/^.+@.+\..+$/);
      expect(u.roles).toBeInstanceOf(Array);
      expect(u.gender).toBe("male");
    }
    expect(new Set(users.map((u) => u.id)).size).toBe(100);
  });

  it("is identical on every start, so serverless instances agree", async () => {
    const first = JSON.stringify(await loadUsers());
    const second = JSON.stringify(await loadUsers());
    expect(second).toBe(first);
  });

  it("starts with one demo account per role", async () => {
    const [admin, moderator, user] = await loadUsers();
    expect([admin.email, admin.roles]).toEqual(["admin@example.com", ["admin"]]);
    expect([moderator.email, moderator.roles]).toEqual(["moderator@example.com", ["moderator"]]);
    expect([user.email, user.roles]).toEqual(["user@example.com", ["user"]]);
  });

  it("gives every seeded user the documented password", async () => {
    expect((await loadUsers()).every((u) => u.password === "password123")).toBe(true);
  });
});
