import "dotenv/config";
import app from "./src/app.js";
const port = process.env.PORT || 3000;

// Local entry point. On Vercel the app is exported from api/index.js instead.
app.listen(port, () => {
  console.log(`the server is listen at http://localhost:${port}`);
});
