import { config } from "dotenv";
config();
import app from "./src/app.js";
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`the server is listen at http://localhost:${port} `.red);
});
