import { getActiveFilesAndFolders, createFolder, deleteItemsFromDatabase } from "../services/fileService.js";

export const handleFileManagerActions = (req, res) => {
  const { action, path, filterPath, name } = req.body;
  console.log(req.body);


  switch (action) {
    case "read":
      // GET CURRENT DIRECTORY ID
      getActiveFilesAndFolders(path, filterPath, res);
      break;
    case "create":
      createFolder(req.body, res);
      break;
    case "delete":
        deleteItemsFromDatabase(req.body, res);
      break;
    case "save":
      console.log("uploading file from main page...");
      break;
    default:
      res.status(400).send("Invalid action");
  }
};




// Function to delete items (files and folders)
const deleteItems = (data, res) => {
    const { path, names, data: items } = data;
    const files = items.filter(item => item.isFile);
    const folders = items.filter(item => !item.isFile);
  
    deleteFiles(files, path, (fileErr) => {
      if (fileErr) {
        console.error("Error deleting files:", fileErr);
        return res.status(500).send("An error occurred while deleting files");
      }
  
      deleteFolders(folders, path, (folderErr) => {
        if (folderErr) {
          console.error("Error deleting folders:", folderErr);
          return res.status(500).send("An error occurred while deleting folders");
        }
  
        res.json({
          success: true,
          message: "Files and folders deleted successfully",
        });
      });
    });
  };
  

  // Function to delete files
const deleteFiles = (files, path, callback) => {
    if (files.length === 0) {
      return callback(null);
    }
  
    const fileNames = files.map(file => file.name);
    getFolderIdByPath(path, (err, folderId) => {
      if (err) {
        return callback(err);
      }
  
      const placeholders = fileNames.map(() => "?").join(",");
      const sql = `DELETE FROM files WHERE folder_id = ? AND name IN (${placeholders})`;
  
      db.query(sql, [folderId, ...fileNames], (err, result) => {
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  };
  
  // Function to delete folders
  const deleteFolders = (folders, path, callback) => {
    if (folders.length === 0) {
      return callback(null);
    }
  
    const folderNames = folders.map(folder => folder.name);
    getFolderIdByPath(path, (err, parentId) => {
      if (err) {
        return callback(err);
      }
  
      const placeholders = folderNames.map(() => "?").join(",");
      const sql = `DELETE FROM folders WHERE parent_id = ? AND name IN (${placeholders})`;
  
      db.query(sql, [parentId, ...folderNames], (err, result) => {
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });
  };