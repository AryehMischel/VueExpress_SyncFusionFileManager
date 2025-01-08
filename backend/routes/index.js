import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ensureAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Construct __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Protected route example
router.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dist/", "index.html")); // Serve the built index.html
});

// Route to handle authentication failure
router.get("/fail", (req, res) => {
  // console.log("User not found");
  res.sendFile(path.join(__dirname, "../public", "blocked.html"));
});

// Home route
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

router.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

export default router;
