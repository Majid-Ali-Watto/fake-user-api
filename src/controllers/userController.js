import { getAllUsers as _getAllUsers, getOneUser as _getOneUser, createNewUser as _createNewUser, updateOneUser as _updateOneUser, deleteOneUser as _deleteOneUser } from "../services/userService.js";

const getAllUsers = (req, res) => {
	const allUsers = _getAllUsers();
	res.send({ status: "OK", data: allUsers });
};

const getOneUser = (req, res) => {
	const {
		params: { userId }
	} = req;
	if (!userId) {
		return;
	}
	const user = _getOneUser(userId);
	res.send({ status: "OK", data: user });
};

const createNewUser = (req, res) => {
	const { body } = req;
	// if (!body.name || !body.mode || !body.equipment || !body.exercises || !body.trainerTips) {
	// 	return;
	// }
	const newUser = {
		firstName: body.firstName,
		lastName: body.lastName,
		email: body.email,
		username: body.username,
		password: body.password,
		age: body.age,
		gender: body.gender,
		country: body.country,
		city: body.city
	};
	const createdUser = _createNewUser(newUser);
	res.status(201).send({ status: "OK", data: createdUser });
};

const updateOneUser = (req, res) => {
	const {
		body,
		params: { userId }
	} = req;
	if (!userId) {
		return;
	}
	const updatedUser = _updateOneUser(userId, body);
	res.send({ status: "OK", data: updatedUser });
};

const deleteOneUser = (req, res) => {
	const {
		params: { userId }
	} = req;
	if (!userId) {
		return;
	}
	_deleteOneUser(userId);
	res.status(204).send({ status: "OK" });
};

export { getAllUsers, getOneUser, createNewUser, updateOneUser, deleteOneUser };
