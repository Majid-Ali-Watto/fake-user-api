"use strict";
import { getAllRoles as _getAllRoles, getOneRole as _getOneRole } from "../database/Role.js";

const getAllRoles = (req, res) => {
  res.json({ status: "OK", data: _getAllRoles() });
};

const getOneRole = (req, res) => {
  res.json({ status: "OK", data: _getOneRole(req.params.name) });
};

export { getAllRoles, getOneRole };
