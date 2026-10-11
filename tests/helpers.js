import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";

export const api = () => request(app);
export const SECRET = process.env.JWT_SECRET;
export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
export const UNKNOWN_ID = "11111111-1111-4111-8111-111111111111";

// Logs in as a seeded demo account: "admin", "moderator" or "user".
export const loginAs = async (who) => {
  const res = await api().post("/api/v1/auth/login").send({ email: `${who}@example.com`, password: "password123" });
  return res.body.data;
};

let counter = 0;
export const uniqueSuffix = () => `${Date.now()}${++counter}`;

export const newUserPayload = (overrides = {}) => {
  const n = uniqueSuffix();
  return {
    firstName: "Test",
    lastName: "Person",
    email: `test${n}@example.com`,
    username: `test${n}`,
    phone: "+1234567",
    age: 30,
    gender: "male",
    country: "Pakistan",
    city: "Lahore",
    ...overrides,
  };
};

export const registerPayload = (overrides = {}) => {
  const n = uniqueSuffix();
  return { firstName: "Reg", lastName: "Person", email: `reg${n}@example.com`, username: `reg${n}`, password: "secret123", ...overrides };
};

// A token signed with the test secret, for cases the API never issues itself.
export const signToken = (payload, options = {}, secret = SECRET) =>
  jwt.sign(payload, secret, { algorithm: "HS256", ...options });
