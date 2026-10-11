"use strict";
import { v4 as uuid } from "uuid";
import {
	getAllUsers as _getAllUsers,
	getOneUser as _getOneUser,
	createNewUser as _createNewUser,
	updateOneUserPartially as _updateOneUserPartially,
	updateOneUserFully as _updateOneUserFully,
	deleteOneUser as _deleteOneUser
} from "../database/User.js";

// Passwords are never returned by the API.
const publicUser = ({ password, ...user }) => user;

const getAllUsers = () => _getAllUsers().map(publicUser);
const getOneUser = (userId) => publicUser(_getOneUser(userId));

// `extra` carries server-set fields (password) that the request body validation doesn't allow.
const createNewUser = (newUser, extra = {}) => {
	const now = new Date().toLocaleString("en-US", { timeZone: "UTC" });
	return publicUser(_createNewUser({ ...newUser, roles: ["user"], ...extra, id: uuid(), createdAt: now, updatedAt: now }));
};

const updateOneUserPartially = (userId, changes) => publicUser(_updateOneUserPartially(userId, changes));
const updateOneUserFully = (userId, changes) => publicUser(_updateOneUserFully(userId, changes));
const deleteOneUser = (userId) => publicUser(_deleteOneUser(userId));

export { getAllUsers, getOneUser, createNewUser, updateOneUserPartially, updateOneUserFully, deleteOneUser, publicUser };
