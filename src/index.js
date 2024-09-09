"use strict";
import express from "express";
import pkg from "body-parser";
const { json } = pkg;
import { config } from "dotenv";
config();
import v1UserRouter from "./v1/routes/userRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(json());
app.use("/api/v1/users", v1UserRouter);

app.listen(PORT, () => {
	console.log(`API is listening on port ${PORT}`);
});
