// routes/s3.js
import express from "express";
const router = express.Router();
import { getPresignedURL } from "../controllers/s3Controller.js";


router.post("/presigned-url",  getPresignedURL);

export default router;