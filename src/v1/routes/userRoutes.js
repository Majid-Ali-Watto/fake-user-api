"use strict";
import { Router } from "express";
import {
  getAllUsers,
  getOneUser,
  createNewUser,
  updateOneUserPartially,
  deleteOneUser,
  updateOneUserFully,
  updateUserRoles,
} from "../../controllers/userController.js";
import {
  paginationSchema,
  uuidFlexibleSchema,
} from "../../validations/commonValidation.js";
import { validate } from "../../middlewares/validate.js";
import { authenticate, authorize } from "../../middlewares/auth.js";
import { methodNotAllowed } from "../../middlewares/methodNotAllowed.js";
import {
  assignRolesSchema,
  createUserSchema,
  updateUserSchema,
} from "../../validations/userValidation.js";

const router = Router();

// GET all or filtered users
router.get("/", validate(paginationSchema, "query"), getAllUsers);
router.get("/:userId", validate(uuidFlexibleSchema, "params"), getOneUser);
router.post("/", validate(createUserSchema, "body"), createNewUser);
router.patch(
  "/:userId",
  validate(uuidFlexibleSchema, "params"),
  validate(updateUserSchema, "body"),
  updateOneUserPartially
);
router.patch(
  "/",
  validate(uuidFlexibleSchema, "query"),
  validate(updateUserSchema, "body"),
  updateOneUserPartially
);
// PUT
router.put(
  "/:userId",
  validate(uuidFlexibleSchema, "params"),
  validate(updateUserSchema, "body"),
  updateOneUserFully
);
router.put(
  "/",
  validate(uuidFlexibleSchema, "query"),
  validate(updateUserSchema, "body"),
  updateOneUserFully
);

router.delete(
  "/:userId",
  validate(uuidFlexibleSchema, "params"),
  deleteOneUser
);
router.delete("/", validate(uuidFlexibleSchema, "query"), deleteOneUser);

// Only admins can change a user's roles.
router.put(
  "/:userId/roles",
  authenticate,
  authorize("admin"),
  validate(uuidFlexibleSchema, "params"),
  validate(assignRolesSchema, "body"),
  updateUserRoles
);

router.all("/:userId/roles", methodNotAllowed("PUT, OPTIONS"));
router.all("/", methodNotAllowed("GET, POST, PATCH, PUT, DELETE, OPTIONS"));
router.all("/:userId", methodNotAllowed("GET, PATCH, PUT, DELETE, OPTIONS"));

export default router;
