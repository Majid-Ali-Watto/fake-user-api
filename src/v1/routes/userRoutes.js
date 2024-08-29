import { Router } from "express";
import { getAllUsers, getOneUser, createNewUser, updateOneUser, deleteOneUser } from "../../controllers/userController.js";

const router = Router();

router.get("/", getAllUsers);

router.get("/:userId", getOneUser);

router.post("/", createNewUser);

router.patch("/:userId", updateOneUser);

router.delete("/:userId", deleteOneUser);

export default router;
