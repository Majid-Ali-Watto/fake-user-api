"use strict";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import v1UserRouter from "./v1/routes/userRoutes.js";
import v1AuthRouter from "./v1/routes/authRoutes.js";
import v1RoleRouter from "./v1/routes/roleRoutes.js";
import { methodNotAllowed } from "./middlewares/methodNotAllowed.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");

// Served at GET /api and /api/v1 so a bare "/api" tells people what exists.
const apiIndex = {
  status: "OK",
  name: "Fake User API",
  version: "v1",
  documentation: "/",
  openapi: "/openapi.json",
  repository: "https://github.com/Majid-Ali-Watto/fake-user-api",
  authentication: "Send 'Authorization: Bearer <accessToken>' where an endpoint's access is not 'public'.",
  demoAccounts: {
    password: "password123",
    logins: ["admin@example.com (admin)", "moderator@example.com (moderator)", "user@example.com (user)"],
  },
  endpoints: [
    { method: "GET", path: "/api/v1/users", access: "public", description: "Paginated list of users (?page=1&limit=10, limit max 100)" },
    { method: "GET", path: "/api/v1/users/:userId", access: "public", description: "One user (also ?userId=<id>)" },
    { method: "POST", path: "/api/v1/users", access: "public", description: "Create a user" },
    { method: "PATCH", path: "/api/v1/users/:userId", access: "public", description: "Update some fields of a user (also ?userId=<id>)" },
    { method: "PUT", path: "/api/v1/users/:userId", access: "public", description: "Replace a user (also ?userId=<id>)" },
    { method: "DELETE", path: "/api/v1/users/:userId", access: "public", description: "Delete a user (also ?userId=<id>)" },
    { method: "PUT", path: "/api/v1/users/:userId/roles", access: "admin", description: "Set a user's roles: { roles: [...] }" },
    { method: "POST", path: "/api/v1/auth/register", access: "public", description: "Create an account and get tokens" },
    { method: "POST", path: "/api/v1/auth/login", access: "public", description: "Log in with { email | username, password } and get tokens" },
    { method: "POST", path: "/api/v1/auth/refresh", access: "public", description: "Exchange { refreshToken } for new tokens" },
    { method: "POST", path: "/api/v1/auth/logout", access: "public", description: "Dummy logout (tokens are stateless)" },
    { method: "GET", path: "/api/v1/auth/me", access: "any logged-in user", description: "The current user, from the access token" },
    { method: "GET", path: "/api/v1/roles", access: "any logged-in user", description: "List roles and their permissions" },
    { method: "GET", path: "/api/v1/roles/:name", access: "any logged-in user", description: "One role (admin, moderator or user)" },
  ],
};

const app = express();
app.set("trust proxy", 1); // behind Vercel's proxy: rate-limit per client IP, not per proxy
app.use(compression());
app.use(helmet());

// The UI lives in public/. On Vercel the CDN serves it before requests reach
// this app; this line serves it for local runs.
// Lets Swagger Editor, Postman and similar tools fetch the spec from the browser.
app.use("/openapi.json", cors());
app.use(express.static(publicDir));

// The test suite sets DISABLE_RATE_LIMIT=1 so it can make hundreds of requests.
const limiter = (limit, skip = () => false) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    skip: (req) => process.env.DISABLE_RATE_LIMIT === "1" || skip(req),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: "FAILED", data: { error: "Too many requests, try again later." } },
  });
const isRead = (req) => req.method === "GET";
// Per IP: reads share a generous budget with the UI, writes get a tighter one.
// Open CORS so browser apps on any origin can call the API (answers preflights before the limiters).
app.use("/api", cors(), limiter(300), limiter(60, isRead), express.json());
app.get(["/api", "/api/v1"], (req, res) => res.json(apiIndex));
app.all(["/api", "/api/v1"], methodNotAllowed("GET, HEAD, OPTIONS"));
app.use("/api/v1/users", v1UserRouter);
app.use("/api/v1/auth", v1AuthRouter);
app.use("/api/v1/roles", v1RoleRouter);

app.use("/api", (req, res) => {
  res.status(404).json({
    status: "FAILED",
    data: { error: `Route ${req.method} ${req.originalUrl} not found` },
  });
});

// Anything else: the HTML 404 page for browsers, JSON for other clients.
app.use((req, res) => {
  res.status(404);
  if (req.accepts(["json", "html"]) === "html") return res.sendFile("404.html", { root: publicDir });
  res.json({ status: "FAILED", data: { error: `Route ${req.method} ${req.originalUrl} not found` } });
});

app.use((err, req, res, next) => {
  const status = err.status || 500; // includes body-parser's 400 for bad JSON
  if (status >= 500) console.error(err);
  if (status === 401) res.set("WWW-Authenticate", "Bearer");
  res.status(status).json({
    status: "FAILED",
    data: { error: status >= 500 ? "Something went wrong!" : err.message },
  });
});
export default app;
