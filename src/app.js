"use strict";
import express from "express";
import pkg from "body-parser";
const { json } = pkg;

import v1UserRouter from "./v1/routes/userRoutes.js";

const app = express();

app.use(json());
app.use("/api/v1/users", v1UserRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});
export default app;
