# Fake User API

A free fake backend for front-end developers: 100 generated users with full CRUD, JWT authentication, roles, and a web UI to browse and edit them. Everything is dummy data, so you can build the front end without writing a backend.

- **UI and API reference:** https://fake-user-api-crud.vercel.app
- **OpenAPI spec:** https://fake-user-api-crud.vercel.app/openapi.json (import into Swagger Editor or Postman)
- **Source:** https://github.com/Majid-Ali-Watto/fake-user-api
- **API base URL:** https://fake-user-api-crud.vercel.app/api/v1/users

Seed data is generated the same way on every start (same users, ids and demo accounts). Changes live in memory and are lost when the server restarts, so they are temporary.
CORS is enabled for all origins. Rate limits per IP, per 15 minutes: 300 requests overall, of which at most 60 can be writes (POST/PATCH/PUT/DELETE). Over the limit you get `429`.

## Authentication and roles (JWT)

Log in to get an access token (1 hour) and a refresh token (7 days), then send
`Authorization: Bearer <accessToken>` to protected endpoints.

```bash
curl -X POST https://fake-user-api-crud.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@example.com", "password": "password123" }'
```

**Demo accounts** (read-only, same on every server instance):

| Login | Role |
| --- | --- |
| `admin@example.com` or `admin` | admin |
| `moderator@example.com` or `moderator` | moderator |
| `user@example.com` or `user` | user |

All seeded users share the password `password123`. Passwords are never returned by the API.

Roles are fixed: `admin` (everything, including role changes), `moderator` (read and edit users) and
`user` (read-only). Role names are in each user's `roles` array. Permissions are descriptive only:
the `/users` CRUD endpoints stay open to everyone, while `PUT /users/:userId/roles` requires `admin`.

- Tokens carry the user's claims and verify on any server instance. Role changes show up in new
  tokens after `POST /auth/refresh` (or a fresh login), as with real JWTs.
- Errors: `401` for a missing, malformed, expired or wrong-type token (with `WWW-Authenticate: Bearer`),
  `403` for a missing role.
- Logout is a dummy: tokens are stateless, so clients just discard them.
- Accounts made with `/auth/register` live in the memory of one server instance, so on Vercel
  a later login for them can land on an instance that doesn't know them. Use the demo accounts for
  anything you need to rely on.
- The JWT secret is public by default (set `JWT_SECRET` to change it). Never use real passwords or data.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/users?page=1&limit=10` | Paginated list (`limit` max 100) |
| GET | `/api/v1/users/:userId` or `?userId=<id>` | One user |
| POST | `/api/v1/users` | Create a user |
| PATCH | `/api/v1/users/:userId` or `?userId=<id>` | Update some fields |
| PUT | `/api/v1/users/:userId` or `?userId=<id>` | Replace a user (unsent fields become `null`) |
| DELETE | `/api/v1/users/:userId` or `?userId=<id>` | Delete a user |
| PUT | `/api/v1/users/:userId/roles` | Set a user's roles, body `{ "roles": ["moderator"] }` (admin only) |
| POST | `/api/v1/auth/register` | Create an account and get tokens |
| POST | `/api/v1/auth/login` | Log in with `{ email or username, password }` and get tokens |
| POST | `/api/v1/auth/refresh` | Exchange `{ refreshToken }` for new tokens |
| POST | `/api/v1/auth/logout` | Dummy logout |
| GET | `/api/v1/auth/me` | Current user (any logged-in user) |
| GET | `/api/v1/roles`, `/api/v1/roles/:name` | Roles and permissions (any logged-in user) |

`GET /api` (or `/api/v1`) returns this endpoint list as JSON.

`userId` must be a UUID v4. Responses look like `{ "status": "OK", "data": ... }`; failures return
`{ "status": "FAILED", ... }` with status `400` (validation or bad JSON), `404` (unknown user or route), `401`/`403` (auth), `405` (method not allowed, with an `Allow` header), `409` (duplicate email), `413` (body too large) or `429` (rate limited). Unknown pages outside `/api` get an HTML 404 page in a browser.

### Example

```bash
curl "https://fake-user-api-crud.vercel.app/api/v1/users?page=2&limit=5"

curl -X POST https://fake-user-api-crud.vercel.app/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "phone": "+1234567890",
    "age": 30,
    "gender": "male",
    "country": "USA",
    "city": "New York"
  }'
```

## API reference

The home page has an expandable reference for every endpoint: parameters, request fields with
rules, a `curl` example, and example responses for each status. It is generated from
[`public/openapi.json`](public/openapi.json), which is also the file to import into other tools.
The tests send every documented example to the real API, so the docs can't drift from the code.

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

Optional `.env`: `PORT`, `JWT_SECRET`.

## Tests

```bash
npm test          # run everything once (about 3 seconds)
npm run test:watch
```

[Vitest](https://vitest.dev) with [Supertest](https://github.com/ladjs/supertest) for the API and
jsdom for the UI code. The suite covers users CRUD and validation, JWT auth (expiry, tampering,
`alg: none`, token types), roles and permissions, routing and error responses (404, 405, 413, 429),
rate limits, CORS, seed-data determinism, the UI and API reference pages, SEO metadata, and the
Vercel configuration. Rate limits are switched off in tests with `DISABLE_RATE_LIMIT=1`.

## Deployment

One Vercel project serves everything: `public/` (the UI) is served by the CDN and `/api/*` is
rewritten to the Express app in `api/index.js` (see `vercel.json`). Import the repo in Vercel
with the default settings. The build command is `npm test`, so a deploy only goes live when every test passes.
