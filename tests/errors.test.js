import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/userService.js", () => ({
  getAllUsers: () => {
    throw new Error("database exploded: secret-connection-string");
  },
  getOneUser: () => {
    throw { status: 418, message: "short and stout" };
  },
}));

const { api } = await import("./helpers.js");

afterEach(() => vi.restoreAllMocks());

describe("unexpected errors", () => {
  it("return a generic 500 and never leak details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await api().get("/api/v1/users");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: "FAILED", data: { error: "Something went wrong!" } });
    expect(JSON.stringify(res.body)).not.toContain("secret-connection-string");
    expect(log).toHaveBeenCalled();
  });

  it("pass through the message of deliberate client errors", async () => {
    const res = await api().get("/api/v1/users/11111111-1111-4111-8111-111111111111");
    expect(res.status).toBe(418);
    expect(res.body.data.error).toBe("short and stout");
  });
});
