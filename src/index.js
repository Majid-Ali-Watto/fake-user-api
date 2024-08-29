// In src/index.js
import express from "express";
import pkg from "body-parser";
const { json } = pkg;
import v1UserRouter from "./v1/routes/userRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// *** ADD ***
app.use(json());
app.use("/api/v1/users", v1UserRouter);

app.listen(PORT, () => {
	console.log(`API is listening on port ${PORT}`);
});
