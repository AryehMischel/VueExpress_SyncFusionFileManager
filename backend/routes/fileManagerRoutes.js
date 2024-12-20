import express from "express";
import multer from "multer";
import path from "path";
import { handleFileManagerActions } from "../controllers/fileManagerController.js";
import { uploadFile } from "../services/fileService.js";
const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

router.post("/upload", uploadFile);
router.post("/actions", handleFileManagerActions);
router.post("/save", save);

function save(){
  console.log("save") 
}

export default router;
