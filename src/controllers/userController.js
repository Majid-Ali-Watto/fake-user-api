"use strict";
import {
  createNewUser as _createNewUser,
  deleteOneUser as _deleteOneUser,
  getAllUsers as _getAllUsers,
  getOneUser as _getOneUser,
  updateOneUserPartially as _updateOneUserPartially,
  updateOneUserFully as _updateOneUserFully,
} from "../services/userService.js";

// Errors thrown here (or in the layers below) are formatted by the error
// middleware in app.js.

// Utility to extract userId from params or query
const getUserIdFromReq = (req) => req.params.userId ?? req.query.userId;

const getOneUser = (req, res) => {
  res.json({ status: "OK", data: _getOneUser(getUserIdFromReq(req)) });
};

const getAllUsers = (req, res) => {
  if (req.query.userId) return getOneUser(req, res);

  const { page, limit } = req.query;
  const allUsers = _getAllUsers();
  const startIndex = (page - 1) * limit;
  const paginatedUsers = allUsers.slice(startIndex, startIndex + limit);

  res.json({
    status: "OK",
    page,
    limit,
    total: allUsers.length,
    totalPages: Math.ceil(allUsers.length / limit),
    count: paginatedUsers.length,
    data: paginatedUsers,
  });
};

const createNewUser = (req, res) => {
  res.status(201).json({ status: "OK", data: _createNewUser(req.body) });
};

const updateOneUserPartially = (req, res) => {
  const updatedUser = _updateOneUserPartially(getUserIdFromReq(req), req.body);
  res.json({ status: "OK", data: updatedUser });
};

const updateOneUserFully = (req, res) => {
  const updatedUser = _updateOneUserFully(getUserIdFromReq(req), req.body);
  res.json({ status: "OK", data: updatedUser });
};

const updateUserRoles = (req, res) => {
  const updatedUser = _updateOneUserPartially(req.params.userId, { roles: req.body.roles });
  res.json({ status: "OK", data: updatedUser });
};

const deleteOneUser = (req, res) => {
  res.json({ status: "OK", data: _deleteOneUser(getUserIdFromReq(req)) });
};

export {
  createNewUser,
  deleteOneUser,
  getAllUsers,
  getOneUser,
  updateOneUserPartially,
  updateOneUserFully,
  updateUserRoles,
};
