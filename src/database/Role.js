"use strict";
// Fixed, dummy role definitions. Users reference them by name in their `roles` array.
const roles = {
	admin: {
		description: "Full access, including role management",
		permissions: ["users:read", "users:write", "users:delete", "roles:read", "roles:manage"]
	},
	moderator: {
		description: "Can read and edit users",
		permissions: ["users:read", "users:write", "roles:read"]
	},
	user: {
		description: "Read-only access",
		permissions: ["users:read", "roles:read"]
	}
};

export const ROLE_NAMES = Object.keys(roles);

export const getAllRoles = () => ROLE_NAMES.map((name) => ({ name, ...roles[name] }));

export const getOneRole = (name) => {
	if (!ROLE_NAMES.includes(name)) throw { status: 404, message: `Can't find role '${name}'` };
	return { name, ...roles[name] };
};
