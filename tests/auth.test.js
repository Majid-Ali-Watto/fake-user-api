import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { api, bearer, loginAs, registerPayload, signToken, UNKNOWN_ID } from "./helpers.js";

const login = (body) => api().post("/api/v1/auth/login").send(body);
const register = (overrides) => api().post("/api/v1/auth/register").send(registerPayload(overrides));

describe("POST /api/v1/auth/login", () => {
  it("logs in with an email", async () => {
    const res = await login({ email: "admin@example.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ tokenType: "Bearer", expiresIn: 3600 });
    expect(res.body.data.user).toMatchObject({ email: "admin@example.com", username: "admin", roles: ["admin"] });
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it("logs in with a username and ignores email case", async () => {
    expect((await login({ username: "moderator", password: "password123" })).body.data.user.roles).toEqual(["moderator"]);
    expect((await login({ email: "USER@Example.COM", password: "password123" })).status).toBe(200);
  });

  it("works for any seeded user", async () => {
    const { body } = await api().get("/api/v1/users?page=7&limit=3");
    for (const user of body.data) {
      expect((await login({ email: user.email, password: "password123" })).status).toBe(200);
    }
  });

  it("never returns the password", async () => {
    const res = await login({ email: "admin@example.com", password: "password123" });
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(JSON.stringify(res.body)).not.toContain("password123");
  });

  it("returns the same 401 for a wrong password and an unknown user", async () => {
    const wrong = await login({ email: "admin@example.com", password: "nope" });
    const unknown = await login({ email: "nobody@example.com", password: "password123" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.data.error).toBe("Invalid credentials");
  });

  it.each([
    ["no identifier", { password: "password123" }],
    ["no password", { email: "admin@example.com" }],
    ["an invalid email", { email: "nope", password: "x" }],
    ["an empty body", {}],
  ])("returns 400 for %s", async (_name, body) => {
    expect((await login(body)).status).toBe(400);
  });

  it("only accepts POST", async () => {
    const res = await api().get("/api/v1/auth/login");
    expect(res.status).toBe(405);
    expect(res.headers.allow).toContain("POST");
  });
});

describe("tokens", () => {
  it("carry the user's claims with the expected lifetimes", async () => {
    const { accessToken, refreshToken, user } = await loginAs("admin");
    const access = jwt.verify(accessToken, process.env.JWT_SECRET);
    const refresh = jwt.verify(refreshToken, process.env.JWT_SECRET);
    expect(access).toMatchObject({ sub: user.id, type: "access", roles: ["admin"], email: "admin@example.com" });
    expect(access.exp - access.iat).toBe(60 * 60);
    expect(refresh).toMatchObject({ sub: user.id, type: "refresh" });
    expect(refresh.exp - refresh.iat).toBe(7 * 24 * 60 * 60);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the current user without a password", async () => {
    const { accessToken, user } = await loginAs("user");
    const res = await api().get("/api/v1/auth/me").set(bearer(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user.id, email: "user@example.com", roles: ["user"] });
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("returns 401 with a WWW-Authenticate header when no token is sent", async () => {
    const res = await api().get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toBe("Bearer");
  });

  it.each([
    ["a non-Bearer scheme", "Basic abc"],
    ["an empty Bearer token", "Bearer "],
    ["garbage", "Bearer abc.def.ghi"],
  ])("rejects %s", async (_name, header) => {
    const res = await api().get("/api/v1/auth/me").set("Authorization", header);
    expect(res.status).toBe(401);
  });

  it("rejects an expired token with a clear message", async () => {
    const token = signToken({ type: "access", roles: ["admin"] }, { subject: UNKNOWN_ID, expiresIn: -10 });
    const res = await api().get("/api/v1/auth/me").set(bearer(token));
    expect(res.status).toBe(401);
    expect(res.body.data.error).toBe("Token expired");
  });

  it("rejects a token signed with another secret and a tampered payload", async () => {
    const forged = signToken({ type: "access", roles: ["admin"] }, { subject: UNKNOWN_ID, expiresIn: 60 }, "other-secret");
    expect((await api().get("/api/v1/auth/me").set(bearer(forged))).status).toBe(401);

    const { accessToken } = await loginAs("user");
    const [header, , signature] = accessToken.split(".");
    const payload = Buffer.from(JSON.stringify({ sub: UNKNOWN_ID, type: "access", roles: ["admin"] })).toString("base64url");
    const tampered = `${header}.${payload}.${signature}`;
    expect((await api().get("/api/v1/auth/me").set(bearer(tampered))).status).toBe(401);
  });

  it("rejects an unsigned (alg: none) token", async () => {
    const part = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const token = `${part({ alg: "none", typ: "JWT" })}.${part({ sub: UNKNOWN_ID, type: "access", roles: ["admin"] })}.`;
    expect((await api().get("/api/v1/auth/me").set(bearer(token))).status).toBe(401);
  });

  it("rejects a refresh token used as an access token", async () => {
    const { refreshToken } = await loginAs("admin");
    const res = await api().get("/api/v1/auth/me").set(bearer(refreshToken));
    expect(res.status).toBe(401);
  });

  it("falls back to the token's claims for a user this instance doesn't know", async () => {
    const token = signToken(
      { type: "access", username: "ghost", email: "ghost@example.com", firstName: "G", lastName: "H", roles: ["user"] },
      { subject: UNKNOWN_ID, expiresIn: 60 }
    );
    const res = await api().get("/api/v1/auth/me").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: UNKNOWN_ID, username: "ghost", email: "ghost@example.com", firstName: "G", lastName: "H", roles: ["user"] });
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("exchanges a refresh token for new tokens", async () => {
    const { refreshToken } = await loginAs("admin");
    const res = await api().post("/api/v1/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("admin@example.com");
    const me = await api().get("/api/v1/auth/me").set(bearer(res.body.data.accessToken));
    expect(me.status).toBe(200);
  });

  it("rejects an access token, garbage and an expired refresh token", async () => {
    const { accessToken } = await loginAs("admin");
    expect((await api().post("/api/v1/auth/refresh").send({ refreshToken: accessToken })).status).toBe(401);
    expect((await api().post("/api/v1/auth/refresh").send({ refreshToken: "garbage" })).status).toBe(401);
    const expired = signToken({ type: "refresh", roles: ["user"] }, { subject: UNKNOWN_ID, expiresIn: -10 });
    const res = await api().post("/api/v1/auth/refresh").send({ refreshToken: expired });
    expect(res.status).toBe(401);
    expect(res.body.data.error).toBe("Token expired");
  });

  it("requires a refreshToken", async () => {
    expect((await api().post("/api/v1/auth/refresh").send({})).status).toBe(400);
  });
});

describe("POST /api/v1/auth/register", () => {
  it("creates an account and returns tokens", async () => {
    const payload = registerPayload();
    const res = await api().post("/api/v1/auth/register").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: payload.email, roles: ["user"] });
    expect(res.body.data.user).not.toHaveProperty("password");
    const me = await api().get("/api/v1/auth/me").set(bearer(res.body.data.accessToken));
    expect(me.body.data.email).toBe(payload.email);
  });

  it("lets the new user log in and appear in the users list", async () => {
    const payload = registerPayload();
    await api().post("/api/v1/auth/register").send(payload);
    expect((await login({ email: payload.email, password: payload.password })).status).toBe(200);
    expect((await login({ email: payload.email, password: "wrong-pass" })).status).toBe(401);
    const list = await api().get("/api/v1/users?limit=100&page=2");
    expect(JSON.stringify(list.body)).not.toContain(payload.password);
  });

  it("cannot self-assign roles", async () => {
    const res = await register({ roles: ["admin"] });
    expect(res.status).toBe(201);
    expect(res.body.data.user.roles).toEqual(["user"]);
    const claims = jwt.decode(res.body.data.accessToken);
    expect(claims.roles).toEqual(["user"]);
  });

  it("rejects a duplicate email, including a seeded one", async () => {
    const payload = registerPayload();
    await api().post("/api/v1/auth/register").send(payload);
    expect((await api().post("/api/v1/auth/register").send({ ...payload, email: payload.email.toUpperCase() })).status).toBe(409);
    expect((await register({ email: "admin@example.com" })).status).toBe(409);
  });

  it.each([
    ["a short password", { password: "12345" }],
    ["a missing password", { password: undefined }],
    ["an invalid email", { email: "nope" }],
    ["a missing username", { username: undefined }],
  ])("rejects %s", async (_name, overrides) => {
    expect((await register(overrides)).status).toBe(400);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("always succeeds, with or without a token", async () => {
    expect((await api().post("/api/v1/auth/logout")).status).toBe(200);
    const { accessToken } = await loginAs("user");
    expect((await api().post("/api/v1/auth/logout").set(bearer(accessToken))).status).toBe(200);
  });
});
