"use strict";
import { Router } from "express";
import {
  getAllUsers,
  getOneUser,
  createNewUser,
  updateOneUserPartially,
  deleteOneUser,
  updateOneUserFully,
} from "../../controllers/userController.js";
import {
  paginationSchema,
  uuidFlexibleSchema,
} from "../../validations/commonValidation.js";
import { validate } from "../../middlewares/validate.js";
import {
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
router.patch("/", validate(updateUserSchema, "body"), updateOneUserPartially);
// PUT
router.put(
  "/:userId",
  validate(uuidFlexibleSchema, "params"),
  validate(updateUserSchema, "body"),
  updateOneUserFully
);
router.put("/", validate(updateUserSchema, "body"), updateOneUserFully);

router.delete(
  "/:userId",
  validate(uuidFlexibleSchema, "params"),
  deleteOneUser
);
router.delete("/", validate(uuidFlexibleSchema, "query"), deleteOneUser);

export default router;
