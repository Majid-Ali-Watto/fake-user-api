import { describe, expect, it } from "vitest";
import { api, bearer, loginAs, registerPayload, UNKNOWN_ID } from "./helpers.js";

const registerUser = async () => (await api().post("/api/v1/auth/register").send(registerPayload())).body.data;

describe("GET /api/v1/roles", () => {
  it("requires a login", async () => {
    expect((await api().get("/api/v1/roles")).status).toBe(401);
    expect((await api().get("/api/v1/roles/admin")).status).toBe(401);
  });

  it("lists the roles with permissions for any logged-in user", async () => {
    const { accessToken } = await loginAs("user");
    const res = await api().get("/api/v1/roles").set(bearer(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.name)).toEqual(["admin", "moderator", "user"]);
    for (const role of res.body.data) {
      expect(role.description).toBeTruthy();
      expect(role.permissions.length).toBeGreaterThan(0);
    }
  });

  it("returns one role, or 404", async () => {
    const { accessToken } = await loginAs("user");
    const ok = await api().get("/api/v1/roles/admin").set(bearer(accessToken));
    expect(ok.body.data).toMatchObject({ name: "admin" });
    expect(ok.body.data.permissions).toContain("roles:manage");
    expect((await api().get("/api/v1/roles/god").set(bearer(accessToken))).status).toBe(404);
  });

  it("is read-only", async () => {
    const { accessToken } = await loginAs("admin");
    for (const method of ["post", "put", "patch", "delete"]) {
      const res = await api()[method]("/api/v1/roles").set(bearer(accessToken));
      expect(res.status).toBe(405);
      expect(res.headers.allow).toContain("GET");
    }
  });
});

describe("PUT /api/v1/users/:userId/roles", () => {
  it("requires a login", async () => {
    const res = await api().put(`/api/v1/users/${UNKNOWN_ID}/roles`).send({ roles: ["user"] });
    expect(res.status).toBe(401);
  });

  it.each(["user", "moderator"])("is forbidden for the %s role", async (who) => {
    const target = await registerUser();
    const { accessToken } = await loginAs(who);
    const res = await api().put(`/api/v1/users/${target.user.id}/roles`).set(bearer(accessToken)).send({ roles: ["admin"] });
    expect(res.status).toBe(403);
    expect(res.body.data.error).toContain("admin");
  });

  it("lets an admin set roles", async () => {
    const target = await registerUser();
    const { accessToken } = await loginAs("admin");
    const res = await api().put(`/api/v1/users/${target.user.id}/roles`).set(bearer(accessToken)).send({ roles: ["moderator", "user"] });
    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual(["moderator", "user"]);
    expect(res.body.data).not.toHaveProperty("password");
    const fetched = await api().get(`/api/v1/users/${target.user.id}`);
    expect(fetched.body.data.roles).toEqual(["moderator", "user"]);
  });

  it.each([
    ["an unknown role", { roles: ["god"] }],
    ["an empty list", { roles: [] }],
    ["duplicates", { roles: ["user", "user"] }],
    ["a non-array", { roles: "admin" }],
    ["a missing field", {}],
  ])("rejects %s", async (_name, body) => {
    const target = await registerUser();
    const { accessToken } = await loginAs("admin");
    const res = await api().put(`/api/v1/users/${target.user.id}/roles`).set(bearer(accessToken)).send(body);
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown user and 400 for a malformed id", async () => {
    const { accessToken } = await loginAs("admin");
    expect((await api().put(`/api/v1/users/${UNKNOWN_ID}/roles`).set(bearer(accessToken)).send({ roles: ["user"] })).status).toBe(404);
    expect((await api().put("/api/v1/users/nope/roles").set(bearer(accessToken)).send({ roles: ["user"] })).status).toBe(400);
  });

  it("protects the demo accounts", async () => {
    const { accessToken, user: admin } = await loginAs("admin");
    const res = await api().put(`/api/v1/users/${admin.id}/roles`).set(bearer(accessToken)).send({ roles: ["user"] });
    expect(res.status).toBe(403);
    expect((await loginAs("admin")).user.roles).toEqual(["admin"]);
  });

  it("only accepts PUT", async () => {
    const { accessToken } = await loginAs("admin");
    const res = await api().get(`/api/v1/users/${UNKNOWN_ID}/roles`).set(bearer(accessToken));
    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain("PUT");
  });

  it("reaches the user's tokens only after a refresh", async () => {
    const target = await registerUser();
    const roleCall = (token) =>
      api().put(`/api/v1/users/${target.user.id}/roles`).set(bearer(token)).send({ roles: ["admin"] });

    expect((await roleCall(target.accessToken)).status).toBe(403);

    const admin = await loginAs("admin");
    await api().put(`/api/v1/users/${target.user.id}/roles`).set(bearer(admin.accessToken)).send({ roles: ["admin"] });

    expect((await roleCall(target.accessToken)).status).toBe(403); // old token still says "user"
    const refreshed = await api().post("/api/v1/auth/refresh").send({ refreshToken: target.refreshToken });
    expect(refreshed.body.data.user.roles).toEqual(["admin"]);
    expect((await roleCall(refreshed.body.data.accessToken)).status).toBe(200);
  });
});
