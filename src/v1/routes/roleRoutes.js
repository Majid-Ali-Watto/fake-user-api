"use strict";
import { Router } from "express";
import { getAllRoles, getOneRole } from "../../controllers/roleController.js";
import { authenticate } from "../../middlewares/auth.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";

const router = Router();

router.use(authenticate); // any logged-in user can read roles
router.get("/", getAllRoles);
router.get("/:name", getOneRole);
router.all(["/", "/:name"], methodNotAllowed("GET, HEAD, OPTIONS"));

export default router;
