"use strict";
import {
  createNewUser as _createNewUser,
  deleteOneUser as _deleteOneUser,
  getAllUsers as _getAllUsers,
  getOneUser as _getOneUser,
  updateOneUserPartially as _updateOneUserPartially,
  updateOneUserFully as _updateOneUserFully,
} from "../services/userService.js";

// Utility to extract userId from params or query
const getUserIdFromReq = (req) => req.params.userId ?? req.query.userId;

const getAllUsers = (req, res) => {
  try {
    const { page, limit } = req.query;
    console.log("Pagination Query:", { page, limit });
    const allUsers = _getAllUsers(); // returns an array

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedUsers = allUsers.slice(startIndex, endIndex);

    res.json({
      status: "OK",
      page,
      limit,
      total: allUsers.length,
      totalPages: Math.ceil(allUsers.length / limit),
      count: paginatedUsers.length,
      data: paginatedUsers,
    });
  } catch (error) {
    res
      .status(error?.status || 500)
      .json({ status: "FAILED", data: { error: error?.message || error } });
  }
};

function getOneUserByID(res, userId) {
  try {
    const user = _getOneUser(userId);
    res.json({ status: "OK", data: user });
  } catch (error) {
    res
      .status(error?.status || 500)
      .json({ status: "FAILED", data: { error: error?.message || error } });
  }
}

const getOneUser = (req, res) => {
  const userId = getUserIdFromReq(req);
  return getOneUserByID(res, userId);
};

const createNewUser = (req, res) => {
  try {
    const createdUser = _createNewUser(req.body);
    res.status(201).json({ status: "OK", data: createdUser });
  } catch (error) {
    res
      .status(error?.status || 500)
      .json({ status: "FAILED", data: { error: error?.message || error } });
  }
};

const updateOneUserPartially = (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const updatedUser = _updateOneUserPartially(userId, req.body);
    res.json({ status: "OK", data: updatedUser });
  } catch (error) {
    res
      .status(error?.status || 500)
      .json({ status: "FAILED", data: { error: error?.message || error } });
  }
};

const updateOneUserFully = (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const updatedUser = _updateOneUserFully(userId, req.body);
    res.json({ status: "OK", data: updatedUser });
  } catch (error) {
    res
      .status(error?.status || 500)
      .json({ status: "FAILED", data: { error: error?.message || error } });
  }
};

const deleteOneUser = (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    const deletedUser = _deleteOneUser(userId);
    res.json({ status: "OK", data: deletedUser });
  } catch (error) {
    res
      .status(error?.status || 500)
      .json({ status: "FAILED", data: { error: error?.message || error } });
  }
};

export {
  createNewUser,
  deleteOneUser,
  getAllUsers,
  getOneUser,
  updateOneUserPartially,
  updateOneUserFully,
};
