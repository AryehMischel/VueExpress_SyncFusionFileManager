import express from "express";
import multer from "multer";
import path from "path";
import { handleFileManagerActions } from "../controllers/fileManagerController.js";
import { uploadFile, checkDuplicateFile, getCWDId, update } from '../services/fileService.js';

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


// const checkDuplicateFileMiddleware = (req, res, next) => {
//   getCWDId(req.body.path, (err, folderId) => {
//     if (err) {
//       console.error("Error getting folder ID by path:", err);
//       return res.status(500).send("An error occurred");
//     }
//     let currDir = folderId;
//     checkDuplicateFile(req.body.name, req.user.userId, currDir, (err, isDuplicate) => {
//       if (err) {
//         console.error("Error checking for duplicate file:", err);
//         return res.status(500).send("An error occurred");
//       }
//       if (isDuplicate) {
//         return res.status(409).send("File already exists");
//       }
//       console.log("No duplicate file found");
//       req.folderId = currDir; // Attach folderId to req object
//       next();
//     });
//   });
// };

export const checkDuplicateFileMiddleware = async (req, res, next) => {
  try {
    const folderId = await getCWDId(req.body.path);
    const isDuplicate = await checkDuplicateFile(req.body.name, folderId, req.user.userId);

    if (isDuplicate) {
      return res.status(409).send("File already exists");
    }

    console.log("No duplicate file found");
    req.folderId = folderId; // Attach folderId to req object
    next();
  } catch (err) {
    console.error("Error in checkDuplicateFileMiddleware:", err);
    return res.status(500).send("An error occurred");
  }
};

const upload = multer({ storage: storage });

router.post("/upload", checkDuplicateFileMiddleware, uploadFile);
router.post("/actions", ensureAuthenticated, handleFileManagerActions);
router.post("/save", save);
router.post("/update", update);

// just testing how to structure backend for our 360 images
// router.get("/getImages", getImages);

function save(){
  console.log("save") 
}

export default router;
