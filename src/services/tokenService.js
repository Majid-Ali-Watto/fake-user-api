"use strict";
import jwt from "jsonwebtoken";

// The secret is public by default: this is a fake backend. Set JWT_SECRET to change it.
const secret = () => process.env.JWT_SECRET || "fake-user-api-demo-secret";
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;

const claimsOf = ({ username, email, firstName, lastName, roles }) => ({ username, email, firstName, lastName, roles });
const sign = (user, type, expiresIn) =>
	jwt.sign({ ...claimsOf(user), type }, secret(), { subject: user.id, expiresIn });

// Tokens carry the user's claims so they verify on any server instance, whether or not
// that instance has the user in memory.
export const issueTokens = (user) => ({
	accessToken: sign(user, "access", ACCESS_TTL_SECONDS),
	refreshToken: sign(user, "refresh", REFRESH_TTL_SECONDS),
	tokenType: "Bearer",
	expiresIn: ACCESS_TTL_SECONDS
});

export const verifyToken = (token, type) => {
	let payload;
	try {
		payload = jwt.verify(token, secret(), { algorithms: ["HS256"] });
	} catch (error) {
		throw { status: 401, message: error.name === "TokenExpiredError" ? "Token expired" : "Invalid token" };
	}
	if (payload.type !== type) throw { status: 401, message: `Invalid token type (expected ${type})` };
	return { id: payload.sub, ...claimsOf(payload) };
};
