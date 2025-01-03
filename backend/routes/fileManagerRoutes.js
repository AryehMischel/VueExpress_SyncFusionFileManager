import express from "express";
import multer from "multer";
import path from "path";
import { handleFileManagerActions } from "../controllers/fileManagerController.js";
import {
  uploadFile,
  checkDuplicateFile,
  getCWDId,
  update,
  updateImageGroup,
  getS3URLS,
  updateImages

} from "../services/fileService.js";

// Importing the getImages function from the fileService.js file
// import { getImages } from '../services/testing.js';

const router = express.Router();

// Middleware to ensure the user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/fail"); // Redirect to fail page if not authenticated
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const checkDuplicateFileMiddleware = async (req, res, next) => {
  let folderId;
  try {
    folderId = await getCWDId(req.body.path);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
    return res.status(500).send("An error occurred");
  }

  let currDir = folderId;
  checkDuplicateFile(
    req.body.name,
    req.user.userId,
    currDir,
    (err, isDuplicate) => {
      if (err) {
        console.error("Error checking for duplicate file:", err);
        return res.status(500).send("An error occurred");
      }
      if (isDuplicate) {
        return res.status(409).send("File already exists");
      }
      // console.log("No duplicate file found");
      req.folderId = currDir; // Attach folderId to req object
      next();
    }
  );
};

const upload = multer({ storage: storage });

router.post("/upload", checkDuplicateFileMiddleware, uploadFile);
router.post("/actions", ensureAuthenticated, handleFileManagerActions);
router.post("/save", save);


// Use PATCH or PUT for updating resources
router.patch("/image-group", ensureAuthenticated, updateImageGroup);
// insert image faces into image table and get upload urls 
router.post("/s3", getS3URLS);
// update the images if the images are successfully uploaded to s3
router.post("/images", updateImages);

// just testing how to structure backend for our 360 images
// router.get("/getImages", getImages);

function save() {
  console.log("save");
}

export default router;
