"use strict";
import { Router } from "express";
import { register, login, refresh, logout, me } from "../../controllers/authController.js";
import { authenticate } from "../../middlewares/auth.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import { validate } from "../../middlewares/validate.js";
import { loginSchema, refreshSchema, registerSchema } from "../../validations/authValidation.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);

router.all("/register", methodNotAllowed("POST, OPTIONS"));
router.all("/login", methodNotAllowed("POST, OPTIONS"));
router.all("/refresh", methodNotAllowed("POST, OPTIONS"));
router.all("/logout", methodNotAllowed("POST, OPTIONS"));
router.all("/me", methodNotAllowed("GET, HEAD, OPTIONS"));

export default router;
