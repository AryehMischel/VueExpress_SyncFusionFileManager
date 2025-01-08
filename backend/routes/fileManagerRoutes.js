import express from "express";
const router = express.Router();

//controllers
import { handleFileManagerActions } from "../controllers/fileManagerController.js";
import {handleUploadFile, handleUpdateImageFormat} from "../controllers/fileManagerController.js";

//middleware
import { ensureAuthenticated } from "../middleware/authMiddleware.js";
import { checkDuplicateFileMiddleware, actionMiddleware } from "../middleware/fileManagerMiddleware.js";


//routes
router.post("/upload", ensureAuthenticated, checkDuplicateFileMiddleware, handleUploadFile); 
router.post("/actions", ensureAuthenticated, actionMiddleware, handleFileManagerActions); //Create, Update, Delete, Rename, Move, Copy, etc
router.patch("/image/360-format", ensureAuthenticated, handleUpdateImageFormat);





export default router;
