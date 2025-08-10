"use strict";
import { getAllUsers as _getAllUsers, createNewUser as _createNewUser, getOneUser as _getOneUser, updateOneUserPartially as _updateOneUserPartially, updateOneUserFully as _updateOneUserFully, deleteOneUser as _deleteOneUser } from "../database/User.js";
import { v4 } from "uuid";
const uuid = v4;
const getAllUsers = () => {
	try {
		const allUsers = _getAllUsers();
		return allUsers;
	} catch (error) {
		throw error;
	}
};

const getOneUser = (userId) => {
	try {
		const user = _getOneUser(userId);
		return user;
	} catch (error) {
		throw error;
	}
};

const createNewUser = (newUser) => {
	const userToInsert = {
		...newUser,
		id: uuid(),
		createdAt: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
		updatedAt: new Date().toLocaleString("en-US", { timeZone: "UTC" })
	};
	try {
		const createdUser = _createNewUser(userToInsert);
		return createdUser;
	} catch (error) {
		throw error;
	}
};

const updateOneUserPartially = (userId, changes) => {
	try {
		const updatedUser = _updateOneUserPartially(userId, changes);
		return updatedUser;
	} catch (error) {
		throw error;
	}
};
const updateOneUserFully = (userId, changes) => {
	try {
		const updatedUser = _updateOneUserFully(userId, changes);
		return updatedUser;
	} catch (error) {
		throw error;
	}
};

const deleteOneUser = (userId) => {
	try {
		return _deleteOneUser(userId);
	} catch (error) {
		throw error;
	}
};

export { getAllUsers, getOneUser, createNewUser, updateOneUserPartially, updateOneUserFully, deleteOneUser };
