import { getAllUsers as _getAllUsers, getOneUser as _getOneUser, createNewUser as _createNewUser, updateOneUser as _updateOneUser, deleteOneUser as _deleteOneUser } from "../services/userService.js";

const getAllUsers = (req, res) => {
	try {
		const allUsers = _getAllUsers();
		res.send({ status: "OK", data: allUsers });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}

};

const getOneUser = (req, res) => {
	const {
		params: { userId }
	} = req;
	if (!userId) {
		res.status(400).send({
			status: "FAILED",
			data: { error: "Parameter ':userId' can not be empty" }
		});
	}
	try {
		const user = _getOneUser(userId);
		res.send({ status: "OK", data: user });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}

};

const createNewUser = (req, res) => {
	const { body } = req;
	const newUser = {
		firstName: body.firstName,
		lastName: body.lastName,
		email: body.email,
		username: body.username,
		phone: body.phone,
		age: body.age,
		gender: body.gender,
		country: body.country,
		city: body.city
	};
	for(const key in newUser) {
		if(newUser[key] === undefined) {
			 res.status(400).send({
					status: "FAILED",
					data: {
						error: "One of the following keys is missing or is empty in request body: 'firstName','lastName','email','username','phone','age','gender','country','city'"
					}
				});
				return;
		}
	}
	try {
		const createdUser = _createNewUser(newUser);
		res.status(201).send({ status: "OK", data: createdUser });
	} catch (error) {
		  res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}

};

const updateOneUser = (req, res) => {
	const {
		body,
		params: { userId }
	} = req;
	if (!userId) {
		res.status(400).send({
			status: "FAILED",
			data: { error: "Parameter ':userId' can not be empty" }
		});
	}
	try {
		const updatedUser = _updateOneUser(userId, body);
		res.send({ status: "OK", data: updatedUser });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}

};

const deleteOneUser = (req, res) => {
	const {
		params: { userId }
	} = req;
	if (!userId) {
		res.status(400).send({
			status: "FAILED",
			data: { error: "Parameter ':userId' can not be empty" }
		});
	}
	try {
		_deleteOneUser(userId);
		res.status(204).send({ status: "OK" });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}

};

export { getAllUsers, getOneUser, createNewUser, updateOneUser, deleteOneUser };
