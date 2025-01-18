import {
  getActiveFilesAndFolders,
  createFolder,
  deleteItemsFromDatabase,
} from "../services/fileManagerService.js";
import { uploadFile, updateImageFormat, getUserImages } from "../services/fileManagerService.js";


export const getImagesTest = async (req, res) => {
  console.log("getImagesTest controller");
  const userId = 1;
  const groupId = null;
  try{
  const result = await getUserImages(userId, groupId, res);
  res.status(200).json(result);
  }catch(error){
    console.error("Error in getImagesTest controller:", error);
    res.status(500).json({ error: error.message });
  }
};
export const handleFileManagerActions = (req, res) => {
  const userId = req.user.userId;
  const { action, path, filterPath, name } = req.body;

  switch (action) {
    case "read":

      // if(req.body.requestedFormat){
      //   console.log("requested format:", );
      // }
      // GET CURRENT DIRECTORY ID
      getActiveFilesAndFolders(userId, path, filterPath, req.body.requestedFormat, res);
      break;
    case "create":
      createFolder(req.body.name, req.body.path, req.user.userId, res);
      break;
    case "delete":
      console.log("deleting items... from controller");
      deleteItemsFromDatabase(req.body, userId, res);
      break;
    case "save":
      console.log("uploading file from main page...");
      break;
    default:
      res.status(400).send("Invalid action");
  }
};

export const handleUploadFile = async (req, res) => {
  const userId = req.user.userId;
  const { name, path } = req.body;

  try {
    const result = await uploadFile(userId, name, path);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in handleUploadFile controller:", error);
    res.status(500).json({ error: error.message });
  }
};


export const handleUpdateImageFormat = async (req, res) => {
  const { format, id } = req.body;
  const userId = req.user.userId;
  try {
    const result = await updateImageFormat(format, id, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in updateImageFormatController:", error);
    res.status(500).json({ error: error.message });
  }
};

// Function to delete items (files and folders)
// const deleteItems = (data, res) => {
//     const { path, names, data: items } = data;
//     const files = items.filter(item => item.isFile);
//     const folders = items.filter(item => !item.isFile);

//     deleteFiles(files, path, (fileErr) => {
//       if (fileErr) {
//         console.error("Error deleting files:", fileErr);
//         return res.status(500).send("An error occurred while deleting files");
//       }

//       deleteFolders(folders, path, (folderErr) => {
//         if (folderErr) {
//           console.error("Error deleting folders:", folderErr);
//           return res.status(500).send("An error occurred while deleting folders");
//         }

//         res.json({
//           success: true,
//           message: "Files and folders deleted successfully",
//         });
//       });
//     });
//   };

// Function to delete files
// const deleteFiles = (files, path, callback) => {
//     if (files.length === 0) {
//       return callback(null);
//     }

//     const fileNames = files.map(file => file.name);
//     getFolderIdByPath(path, (err, folderId) => {
//       if (err) {
//         return callback(err);
//       }

//       const placeholders = fileNames.map(() => "?").join(",");
//       const sql = `DELETE FROM files WHERE folder_id = ? AND name IN (${placeholders})`;

//       db.query(sql, [folderId, ...fileNames], (err, result) => {
//         if (err) {
//           return callback(err);
//         }
//         callback(null);
//       });
//     });
//   };

// Function to get the folder ID by path
