import { checkDuplicateFile, checkDuplicateFolder, getCWDId } from "../services/fileManagerService.js";

export const checkDuplicateFileMiddleware = async (req, res, next) => {
  console.log("Checking for duplicate file");
  let folderId;
  try {
    folderId = await getCWDId(req.body.path);
    console.log("Folder ID:", folderId);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
    return res.status(500).send("An error occurred");
  }

  let currDir = folderId;
  let userId = req.user.userId;

  checkDuplicateFile(req.body.name, currDir, userId, (err, isDuplicate) => {
    if (err) {
      console.error("Error checking for duplicate file:", err);
      return res.status(500).send("An error occurred");
    }
    if (isDuplicate) {
      return res.status(409).send("File already exists");
    } else {
      console.log("No duplicate file found");
    }
    // console.log("No duplicate file found");
    req.folderId = currDir; // Attach folderId to req object
    next();
  });
};



export async function actionMiddleware(req, res, next) {
    const userId = req.user.userId;
    const { action, path, filterPath, name } = req.body;
  
    switch (action) {
      case "create":
        console.log("Checking for duplicate folder");
        console.log("name:", req.body.name);
        console.log("path", req.body.path);
  
        let folderId;
        try {
          folderId = await getCWDId(req.body.path);
          console.log("Folder ID:", folderId);
        } catch (err) {
          console.error("Error getting folder ID by path:", err);
          return res.status(500).send("An error occurred");
        }
  
        let currDir = folderId;
  
        checkDuplicateFolder(req.body.name, currDir, userId, (err, isDuplicate) => {
          if (err) {
            console.error("Error checking for duplicate folder:", err);
            return res.status(500).send("An error occurred");
          }
          if (isDuplicate) {
            return res.status(409).send("Folder already exists");
          } else {
            console.log("No duplicate folder found");
            req.folderId = currDir; // Attach folderId to req object
            next();
          }
        });
        break;
      default:
        return next();
    }
  }

export const checkDuplicateFolderMiddleware = async (req, res, next) => {
  console.log("Checking for duplicate folder");
  let folderId;
  try {
    folderId = await getCWDId(req.body.path);
    console.log("Folder ID:", folderId);
  } catch (err) {
    console.error("Error getting folder ID by path:", err);
    return res.status(500).send("An error occurred");
  }

  let currDir = folderId;
  let userId = req.user.userId;

  checkDuplicateFile(req.body.name, currDir, userId, (err, isDuplicate) => {
    if (err) {
      console.error("Error checking for duplicate file:", err);
      return res.status(500).send("An error occurred");
    }
    if (isDuplicate) {
      return res.status(409).send("File already exists");
    } else {
      console.log("No duplicate file found");
    }
    // console.log("No duplicate file found");
    req.folderId = currDir; // Attach folderId to req object
    next();
  });
};
