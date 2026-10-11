import { verifyToken } from "../services/tokenService.js";

// Requires "Authorization: Bearer <access token>"; sets req.auth to the token's user claims.
export const authenticate = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw { status: 401, message: "Missing or malformed Authorization header. Expected: Bearer <token>" };
  }
  req.auth = verifyToken(token, "access");
  next();
};

// Use after authenticate: allows the request if the user has at least one of the given roles.
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.auth.roles?.some((role) => roles.includes(role))) {
      throw { status: 403, message: `Forbidden: requires one of these roles: ${roles.join(", ")}` };
    }
    next();
  };
