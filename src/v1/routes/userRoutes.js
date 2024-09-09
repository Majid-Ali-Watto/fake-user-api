"use strict";
import { Router } from "express";
import { getAllUsers, getOneUser, createNewUser, updateOneUserPartially, deleteOneUser, updateOneUserFully } from "../../controllers/userController.js";

const router = Router();

router.get("/", getAllUsers);
router.get("/:userId", getOneUser);

router.post("/", createNewUser);

router.patch("/:userId", updateOneUserPartially);
router.patch("/", updateOneUserPartially);

router.put("/:userId", updateOneUserFully);
router.put("/", updateOneUserFully);

router.delete("/:userId", deleteOneUser);
router.delete("/", deleteOneUser);

export default router;
