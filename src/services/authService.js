"use strict";
import { findUser, findUserByCredentials } from "../database/User.js";
import { createNewUser, publicUser } from "./userService.js";
import { issueTokens, verifyToken } from "./tokenService.js";

const session = (user) => ({ user: publicUser(user), ...issueTokens(user) });

const register = ({ password, ...profile }) => {
	const user = createNewUser(profile, { password });
	return session(user);
};

const login = (credentials) => {
	const user = findUserByCredentials(credentials);
	if (!user) throw { status: 401, message: "Invalid credentials" };
	return session(user);
};

// Reload the user so role changes take effect; fall back to the token's own claims when this
// instance doesn't have the user (e.g. a registered user created on another instance).
const refresh = (refreshToken) => {
	const claims = verifyToken(refreshToken, "refresh");
	return session(findUser(claims.id) ?? claims);
};

const getProfile = (claims) => publicUser(findUser(claims.id) ?? claims);

export { register, login, refresh, getProfile };
