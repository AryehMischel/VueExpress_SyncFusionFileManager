import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ensureAuthenticated } from "../middleware/authMiddleware.js";
const router = express.Router();

// Construct __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);





// Route to handle authentication failure
// router.get("/",  (req, res) => {
//   res.sendFile(path.join(__dirname, "../public", "dashboard.html"));
// });

// // Route to handle authentication failure
// router.get("/index",  (req, res) => {
//   res.sendFile(path.join(__dirname, "../public", "dashboard.html"));
// });

export default router;