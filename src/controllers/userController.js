"use strict";
import { createNewUser as _createNewUser, deleteOneUser as _deleteOneUser, getAllUsers as _getAllUsers, getOneUser as _getOneUser, updateOneUserPartially as _updateOneUserPartially, updateOneUserFully as _updateOneUserFully } from "../services/userService.js";

const getAllUsers = (req, res) => {
	if (req.query.userId) {
		getOneUserByID(res, req.query.userId);
		return;
	}
	try {
		const allUsers = _getAllUsers();
		res.send({ status: "OK", count: allUsers?.length, data: allUsers });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}
};
function getOneUserByID(res, userId) {
	try {
		const user = _getOneUser(userId);
		res.send({ status: "OK", data: user });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}
}
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
	getOneUserByID(res, userId);
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
	for (const key in newUser) {
		if (newUser[key] === undefined) {
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

const updateOneUserPartially = (req, res) => {
	const { body, params, query } = req;
	const userId = params.userId ?? query.userId;
	if (!userId) {
		res.status(400).send({
			status: "FAILED",
			data: { error: "Parameter ':userId' can not be empty" }
		});
	}
	try {
		const updatedUser = _updateOneUserPartially(userId, body);
		res.send({ status: "OK", data: updatedUser });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}
};
const updateOneUserFully = (req, res) => {
	const { body, params, query } = req;
	const userId = params.userId ?? query.userId;
	if (!userId) {
		res.status(400).send({
			status: "FAILED",
			data: { error: "Parameter ':userId' can not be empty" }
		});
	}
	try {
		const updatedUser = _updateOneUserFully(userId, body);
		res.send({ status: "OK", data: updatedUser });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}
};
const deleteOneUser = (req, res) => {
	const { params, query } = req;
	const userId = params.userId ?? query.userId;
	console.log(userId);
	if (!userId) {
		res.status(400).send({
			status: "FAILED",
			data: { error: "Parameter ':userId' can not be empty" }
		});
	}
	try {
		const deletedUser = _deleteOneUser(userId);
		console.log("deleted ", deletedUser);
		res.send({ data: deletedUser, status: "OK" });
	} catch (error) {
		res.status(error?.status || 500).send({ status: "FAILED", data: { error: error?.message || error } });
	}
};

export { createNewUser, deleteOneUser, getAllUsers, getOneUser, updateOneUserPartially, updateOneUserFully };
