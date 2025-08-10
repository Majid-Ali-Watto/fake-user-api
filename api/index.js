// src/index.js
import express from "express";
import serverless from "serverless-http";
import bodyParser from "body-parser";
import { config } from "dotenv";
import v1UserRouter from "./v1/routes/userRoutes.js";

config();

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use("/api/v1/users", v1UserRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// No app.listen() here for Vercel
export const handler = serverless(app);
