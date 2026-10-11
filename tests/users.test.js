import { describe, expect, it } from "vitest";
import { api, loginAs, newUserPayload, UNKNOWN_ID } from "./helpers.js";

const createUser = async (overrides) => (await api().post("/api/v1/users").send(newUserPayload(overrides))).body.data;
const demoUserId = async (index = 2) => (await api().get("/api/v1/users?limit=5")).body.data[index].id;

describe("GET /api/v1/users", () => {
  it("returns the first page with pagination metadata", async () => {
    const res = await api().get("/api/v1/users");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "OK", page: 1, limit: 10, total: 100, totalPages: 10, count: 10 });
    expect(res.body.data).toHaveLength(10);
  });

  it("honours page and limit", async () => {
    const res = await api().get("/api/v1/users?page=3&limit=4");
    expect(res.body).toMatchObject({ page: 3, limit: 4, totalPages: 25, count: 4 });
    const first = await api().get("/api/v1/users?page=1&limit=12");
    expect(res.body.data.map((u) => u.id)).toEqual(first.body.data.slice(8, 12).map((u) => u.id));
  });

  it("allows the maximum limit of 100", async () => {
    const res = await api().get("/api/v1/users?limit=100");
    expect(res.body.data).toHaveLength(100);
  });

  it("returns an empty page past the end", async () => {
    const res = await api().get("/api/v1/users?page=999");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ count: 0, data: [] });
  });

  it.each([["page=0"], ["page=-1"], ["page=1.5"], ["limit=0"], ["limit=101"], ["limit=abc"]])(
    "rejects invalid pagination (%s)",
    async (query) => {
      const res = await api().get(`/api/v1/users?${query}`);
      expect(res.status).toBe(400);
      expect(res.body.status).toBe("FAILED");
    }
  );

  it("never exposes passwords", async () => {
    const res = await api().get("/api/v1/users?limit=100");
    expect(res.body.data.every((u) => !("password" in u))).toBe(true);
  });

  it("gives every user a role array", async () => {
    const res = await api().get("/api/v1/users?limit=100");
    expect(res.body.data.every((u) => Array.isArray(u.roles) && u.roles.length > 0)).toBe(true);
  });

  it("returns a single user for ?userId=", async () => {
    const id = await demoUserId();
    const res = await api().get(`/api/v1/users?userId=${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });
});

describe("GET /api/v1/users/:userId", () => {
  it("returns the user", async () => {
    const id = await demoUserId();
    const res = await api().get(`/api/v1/users/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id, email: "user@example.com" });
  });

  it("returns 404 for an unknown id", async () => {
    const res = await api().get(`/api/v1/users/${UNKNOWN_ID}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ status: "FAILED", data: { error: `Can't find user with the id '${UNKNOWN_ID}'` } });
  });

  it("returns 400 for a malformed id", async () => {
    expect((await api().get("/api/v1/users/not-a-uuid")).status).toBe(400);
  });
});

describe("POST /api/v1/users", () => {
  it("creates a user", async () => {
    const payload = newUserPayload();
    const res = await api().post("/api/v1/users").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ ...payload, roles: ["user"] });
    expect(res.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.data.createdAt).toBeTruthy();
    const fetched = await api().get(`/api/v1/users/${res.body.data.id}`);
    expect(fetched.body.data.email).toBe(payload.email);
  });

  it("rejects an empty body with every missing field listed", async () => {
    const res = await api().post("/api/v1/users").send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(9);
  });

  it.each([
    ["email", { email: "nope" }],
    ["username", { username: "bad name!" }],
    ["phone", { phone: "abc" }],
    ["age", { age: 0 }],
    ["gender", { gender: "robot" }],
    ["firstName", { firstName: "A" }],
  ])("rejects an invalid %s", async (_field, overrides) => {
    const res = await api().post("/api/v1/users").send(newUserPayload(overrides));
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email, ignoring case", async () => {
    const user = await createUser();
    const res = await api().post("/api/v1/users").send(newUserPayload({ email: user.email.toUpperCase() }));
    expect(res.status).toBe(409);
  });

  it("ignores fields it doesn't accept, so roles can't be self-assigned", async () => {
    const res = await api().post("/api/v1/users").send(newUserPayload({ roles: ["admin"], password: "password123", isActive: true }));
    expect(res.status).toBe(201);
    expect(res.body.data.roles).toEqual(["user"]);
    expect(res.body.data).not.toHaveProperty("password");
    const login = await api().post("/api/v1/auth/login").send({ email: res.body.data.email, password: "password123" });
    expect(login.status).toBe(401); // users made here have no password
  });
});

describe("PATCH /api/v1/users", () => {
  it("updates only the given fields", async () => {
    const user = await createUser();
    const res = await api().patch(`/api/v1/users/${user.id}`).send({ city: "Rome" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ ...user, city: "Rome" });
    expect(res.body.data.updatedAt).toBeTruthy();
  });

  it("works with ?userId=", async () => {
    const user = await createUser();
    const res = await api().patch(`/api/v1/users?userId=${user.id}`).send({ city: "Oslo" });
    expect(res.body.data.city).toBe("Oslo");
  });

  it("cannot change roles, id or password", async () => {
    const user = await createUser();
    const res = await api().patch(`/api/v1/users/${user.id}`).send({ city: "Rome", roles: ["admin"], id: UNKNOWN_ID, password: "x" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user.id, roles: ["user"] });
  });

  it("rejects an empty body and invalid values", async () => {
    const user = await createUser();
    expect((await api().patch(`/api/v1/users/${user.id}`).send({})).status).toBe(400);
    expect((await api().patch(`/api/v1/users/${user.id}`).send({ age: 500 })).status).toBe(400);
  });

  it("returns 404 for an unknown user and 400 without an id", async () => {
    expect((await api().patch(`/api/v1/users/${UNKNOWN_ID}`).send({ city: "Rome" })).status).toBe(404);
    expect((await api().patch("/api/v1/users").send({ city: "Rome" })).status).toBe(400);
  });
});

describe("PUT /api/v1/users", () => {
  it("replaces the user but keeps its id and roles", async () => {
    const user = await createUser();
    const res = await api().put(`/api/v1/users/${user.id}`).send({ firstName: "Only", lastName: "Name" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user.id, firstName: "Only", lastName: "Name", city: null, email: null, roles: ["user"] });
  });

  it("works with ?userId= and returns 404 for an unknown user", async () => {
    const user = await createUser();
    expect((await api().put(`/api/v1/users?userId=${user.id}`).send({ city: "Rome" })).status).toBe(200);
    expect((await api().put(`/api/v1/users/${UNKNOWN_ID}`).send({ city: "Rome" })).status).toBe(404);
  });
});

describe("DELETE /api/v1/users", () => {
  it("deletes the user and returns it as an object", async () => {
    const user = await createUser();
    const res = await api().delete(`/api/v1/users/${user.id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(false);
    expect(res.body.data.id).toBe(user.id);
    expect((await api().get(`/api/v1/users/${user.id}`)).status).toBe(404);
    expect((await api().delete(`/api/v1/users/${user.id}`)).status).toBe(404);
  });

  it("works with ?userId= and requires an id", async () => {
    const user = await createUser();
    expect((await api().delete(`/api/v1/users?userId=${user.id}`)).status).toBe(200);
    expect((await api().delete("/api/v1/users")).status).toBe(400);
  });

  it("reduces the total by one", async () => {
    const user = await createUser();
    const before = (await api().get("/api/v1/users?limit=1")).body.total;
    await api().delete(`/api/v1/users/${user.id}`);
    expect((await api().get("/api/v1/users?limit=1")).body.total).toBe(before - 1);
  });
});

describe("demo accounts", () => {
  it.each([
    ["PATCH", (id) => api().patch(`/api/v1/users/${id}`).send({ city: "Rome" })],
    ["PUT", (id) => api().put(`/api/v1/users/${id}`).send({ city: "Rome" })],
    ["DELETE", (id) => api().delete(`/api/v1/users/${id}`)],
  ])("are read-only (%s)", async (_method, call) => {
    for (const index of [0, 1, 2]) {
      const res = await call(await demoUserId(index));
      expect(res.status).toBe(403);
    }
  });

  it("can still log in after attempted changes", async () => {
    expect((await loginAs("admin")).user.roles).toEqual(["admin"]);
  });
});
