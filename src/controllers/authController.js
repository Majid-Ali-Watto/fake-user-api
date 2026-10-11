"use strict";
import { getProfile, login as _login, refresh as _refresh, register as _register } from "../services/authService.js";

const register = (req, res) => {
  res.status(201).json({ status: "OK", data: _register(req.body) });
};

const login = (req, res) => {
  res.json({ status: "OK", data: _login(req.body) });
};

const refresh = (req, res) => {
  res.json({ status: "OK", data: _refresh(req.body.refreshToken) });
};

// Tokens are stateless, so there is nothing to revoke: the client just discards them.
const logout = (req, res) => {
  res.json({ status: "OK", data: { message: "Logged out. Discard your tokens on the client." } });
};

const me = (req, res) => {
  res.json({ status: "OK", data: getProfile(req.auth) });
};

export { register, login, refresh, logout, me };
