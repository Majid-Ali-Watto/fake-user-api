import { generateUsers as _generateUsers, createNewUser as _createNewUser, getOneUser as _getOneUser, updateOneUser as _updateOneUser, deleteOneUser as _deleteOneUser } from "../database/User.js";
import { v4 } from "uuid";
const uuid = v4;
const getAllUsers = () => {
	const allUsers = _generateUsers(100);
	console.log(allUsers);
	return allUsers;
};

const getOneUser = (userId) => {
	const user = _getOneUser(userId);
	return user;
};

const createNewUser = (newUser) => {
	const userToInsert = {
		...newUser,
		id: uuid(),
		createdAt: new Date().toLocaleString("en-US", { timeZone: "UTC" }),
		updatedAt: new Date().toLocaleString("en-US", { timeZone: "UTC" })
	};
	const createdUser = _createNewUser(userToInsert);
	return createdUser;
};

const updateOneUser = (userId, changes) => {
	const updatedUser = _updateOneUser(userId, changes);
	return updatedUser;
};

const deleteOneUser = (userId) => {
	_deleteOneUser(userId);
};

export { getAllUsers, getOneUser, createNewUser, updateOneUser, deleteOneUser };
