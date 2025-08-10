"use strict";
import express from "express";
import pkg from "body-parser";
const { json } = pkg;
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import v1UserRouter from "./v1/routes/userRoutes.js";

const app = express();
app.use((req, res, next) => {
  res.removeHeader("Content-Length"); // force compression recalculation
  next();
});
// Enable gzip compression
app.use(compression({ threshold: 0 }));
app.use(helmet());

// Apply rate limiting (example: 100 requests / 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(json());
app.use("/api/v1/users", v1UserRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});
export default app;
